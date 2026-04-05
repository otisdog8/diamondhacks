import { google } from "googleapis";
import type { IClassInfo } from "@/lib/db/types";
import { getQuarterDates, inferQuarterWeeks, getFirstDayInQuarter, getFinalExamDate } from "@/lib/quarter-dates";
import { parseLocationToBuilding, getWalkingMinutes, locationLabel } from "@/lib/travel/walking-times";

const DAY_MAP: Record<number, string> = {
  0: "SU", 1: "MO", 2: "TU", 3: "WE", 4: "TH", 5: "FR", 6: "SA",
};

const CALENDAR_COLORS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!clientId || !clientSecret) return null;

  return new google.auth.OAuth2(clientId, clientSecret, `${appUrl}/api/calendar/callback`);
}

export function isGoogleApiConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getAuthUrl(state?: string): string | null {
  const client = getOAuth2Client();
  if (!client) return null;

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    state,
  });
}

export async function exchangeCode(code: string): Promise<{ refreshToken: string }> {
  const client = getOAuth2Client();
  if (!client) throw new Error("Google OAuth not configured");

  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("No refresh token received — user may need to re-authorize");
  }

  return { refreshToken: tokens.refresh_token };
}

function getAuthedClient(refreshToken: string) {
  const client = getOAuth2Client();
  if (!client) throw new Error("Google OAuth not configured");
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

/** List calendars the user can write to */
export async function listCalendars(refreshToken: string): Promise<
  { id: string; summary: string; primary: boolean }[]
> {
  const auth = getAuthedClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.calendarList.list({ minAccessRole: "writer" });
  const items = res.data.items || [];

  return items.map((item) => ({
    id: item.id || "",
    summary: item.summary || "(untitled)",
    primary: item.primary || false,
  }));
}

// ── Event fetching ──────────────────────────────────────────────

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string; // ISO datetime
  end: string;
  allDay: boolean;
  recurringEventId?: string;
  colorId?: string;
}

/** Fetch events from a Google Calendar within a time range */
export async function fetchCalendarEvents(
  refreshToken: string,
  calendarId: string = "primary",
  timeMin?: string,
  timeMax?: string,
): Promise<GoogleCalendarEvent[]> {
  const auth = getAuthedClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const defaultMin = new Date(now);
  defaultMin.setDate(defaultMin.getDate() - 14); // 2 weeks ago
  const defaultMax = new Date(now);
  defaultMax.setDate(defaultMax.getDate() + 12 * 7); // 12 weeks out

  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    const res = await calendar.events.list({
      calendarId,
      timeMin: timeMin || defaultMin.toISOString(),
      timeMax: timeMax || defaultMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
      pageToken,
    });

    for (const item of res.data.items || []) {
      const allDay = !!(item.start?.date && !item.start?.dateTime);
      events.push({
        id: item.id || "",
        summary: item.summary || "",
        description: item.description || undefined,
        location: item.location || undefined,
        start: item.start?.dateTime || item.start?.date || "",
        end: item.end?.dateTime || item.end?.date || "",
        allDay,
        recurringEventId: item.recurringEventId || undefined,
        colorId: item.colorId || undefined,
      });
    }

    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  return events;
}

// ── Event export ────────────────────────────────────────────────

/**
 * Resolve the quarter start date for a class.
 * Priority: class field > known UCSD dates > today.
 */
function resolveQuarterStart(cls: IClassInfo): string {
  if (cls.quarterStartDate) return cls.quarterStartDate;
  const known = getQuarterDates(cls.term);
  if (known) return known.start;
  // Fallback: today (not ideal, but better than crashing)
  return new Date().toISOString().split("T")[0];
}

/**
 * Export classes to a specific Google Calendar.
 * Uses quarter start date for first event and COUNT for recurrence.
 */
export async function exportClassesToCalendar(
  refreshToken: string,
  classes: IClassInfo[],
  calendarId: string = "primary",
): Promise<{ eventsCreated: number; errors: string[] }> {
  const auth = getAuthedClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });
  const errors: string[] = [];
  let eventsCreated = 0;

  // Get user's timezone
  let timeZone = "America/Los_Angeles";
  try {
    const settings = await calendar.settings.get({ setting: "timezone" });
    if (settings.data.value) timeZone = settings.data.value;
  } catch { /* use default */ }

  for (let i = 0; i < classes.length; i++) {
    const cls = classes[i];
    const colorId = CALENDAR_COLORS[i % CALENDAR_COLORS.length];
    const quarterStart = resolveQuarterStart(cls);
    const weeks = inferQuarterWeeks(cls.term);

    for (const slot of cls.schedule) {
      const slotType = slot.type?.toLowerCase() ?? "";

      // Finals/midterms: single non-recurring event on the exam date
      if (slotType === "final" || slotType === "midterm") {
        const examDate = getFinalExamDate(cls.term, slot.dayOfWeek);
        if (!examDate) continue;
        const label = slotType === "final" ? "FINAL" : "MIDTERM";
        try {
          await calendar.events.insert({
            calendarId,
            requestBody: {
              summary: `${label}: ${cls.code}`,
              description: [
                `${cls.name} — ${label.charAt(0) + label.slice(1).toLowerCase()} Exam`,
                cls.instructor ? `Instructor: ${cls.instructor}` : "",
                slot.location ? `Location: ${slot.location}` : "",
              ].filter(Boolean).join("\n"),
              location: slot.location || undefined,
              colorId: "11", // red
              start: { dateTime: `${examDate}T${slot.startTime}:00`, timeZone },
              end: { dateTime: `${examDate}T${slot.endTime}:00`, timeZone },
              // No recurrence — single event
            },
          });
          eventsCreated++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          errors.push(`${cls.code} ${label}: ${msg}`);
        }
        continue;
      }

      const rruleDay = DAY_MAP[slot.dayOfWeek];
      if (!rruleDay) continue;

      // First occurrence of this day of week on or after quarter start
      const firstDate = getFirstDayInQuarter(quarterStart, slot.dayOfWeek);

      try {
        await calendar.events.insert({
          calendarId,
          requestBody: {
            summary: slot.type === "office_hours" && slot.host
              ? `${cls.code} OH — ${slot.host}`
              : `${cls.code}: ${cls.name}`,
            description: [
              cls.instructor ? `Instructor: ${cls.instructor}` : "",
              `Type: ${slot.type}`,
              slot.host ? `Host: ${slot.host}` : "",
              cls.description || "",
            ].filter(Boolean).join("\n"),
            location: slot.location || undefined,
            colorId,
            start: { dateTime: `${firstDate}T${slot.startTime}:00`, timeZone },
            end: { dateTime: `${firstDate}T${slot.endTime}:00`, timeZone },
            recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${rruleDay};COUNT=${weeks}`],
          },
        });
        eventsCreated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${cls.code} ${slot.type} on ${rruleDay}: ${msg}`);
      }
    }
  }

  return { eventsCreated, errors };
}

/**
 * Export travel buffer events to Google Calendar.
 * Creates a recurring "Walk to {building}" event before each class.
 */
export async function exportTravelEventsToCalendar(
  refreshToken: string,
  classes: IClassInfo[],
  homeBase: string | null,
  calendarId: string = "primary",
): Promise<{ eventsCreated: number; errors: string[] }> {
  const auth = getAuthedClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });
  const errors: string[] = [];
  let eventsCreated = 0;

  let timeZone = "America/Los_Angeles";
  try {
    const settings = await calendar.settings.get({ setting: "timezone" });
    if (settings.data.value) timeZone = settings.data.value;
  } catch { /* use default */ }

  // For each class, find consecutive pairs by day-of-week
  const enabledClasses = classes.filter((c) => c.enabled);

  // Group all schedule slots by dayOfWeek
  const slotsByDay = new Map<number, { cls: IClassInfo; slot: IClassInfo["schedule"][number] }[]>();
  for (const cls of enabledClasses) {
    for (const slot of cls.schedule) {
      const t = slot.type?.toLowerCase() ?? "";
      if (t === "final" || t === "midterm") continue;
      let arr = slotsByDay.get(slot.dayOfWeek);
      if (!arr) { arr = []; slotsByDay.set(slot.dayOfWeek, arr); }
      arr.push({ cls, slot });
    }
  }

  for (const [dayOfWeek, slots] of slotsByDay) {
    const rruleDay = DAY_MAP[dayOfWeek];
    if (!rruleDay) continue;

    // Sort by start time
    const sorted = [...slots].sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));

    for (let i = 0; i < sorted.length; i++) {
      const { cls, slot } = sorted[i];
      const toBuilding = slot.location ? parseLocationToBuilding(slot.location) : null;
      if (!toBuilding) continue;

      let fromName: string | null;
      let prevEndTime: string | null = null;
      if (i === 0) {
        fromName = homeBase;
      } else {
        const prevSlot = sorted[i - 1].slot;
        fromName = prevSlot.location ? parseLocationToBuilding(prevSlot.location) : null;
        prevEndTime = prevSlot.endTime;
      }

      if (!fromName || fromName === toBuilding) continue;
      const walkMins = getWalkingMinutes(fromName, toBuilding);
      if (walkMins == null || walkMins === 0) continue;

      const totalMins = walkMins + 2; // peak buffer

      // Compute travel end time (= class start) and start time
      const [startH, startM] = slot.startTime.split(":").map(Number);
      const travelEndMinutes = startH * 60 + startM;
      let travelStartMinutes = travelEndMinutes - totalMins;

      // Clamp to prev class end if needed
      if (prevEndTime) {
        const [prevH, prevM] = prevEndTime.split(":").map(Number);
        const prevEndMins = prevH * 60 + prevM;
        if (travelStartMinutes < prevEndMins) travelStartMinutes = prevEndMins;
      }

      const travelStartStr = `${String(Math.floor(travelStartMinutes / 60)).padStart(2, "0")}:${String(travelStartMinutes % 60).padStart(2, "0")}`;
      const travelEndStr = slot.startTime;

      const quarterStart = resolveQuarterStart(cls);
      const weeks = inferQuarterWeeks(cls.term);
      const firstDate = getFirstDayInQuarter(quarterStart, dayOfWeek);

      try {
        await calendar.events.insert({
          calendarId,
          requestBody: {
            summary: `Walk to ${toBuilding}`,
            description: `${walkMins} min walk from ${locationLabel(fromName)}`,
            colorId: "6", // tangerine/orange
            start: { dateTime: `${firstDate}T${travelStartStr}:00`, timeZone },
            end: { dateTime: `${firstDate}T${travelEndStr}:00`, timeZone },
            recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${rruleDay};COUNT=${weeks}`],
          },
        });
        eventsCreated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Travel to ${toBuilding} on ${rruleDay}: ${msg}`);
      }
    }
  }

  return { eventsCreated, errors };
}
