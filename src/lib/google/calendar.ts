import { google } from "googleapis";
import type { IClassInfo } from "@/lib/db/types";

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

/** Returns true if Google OAuth credentials are configured */
export function isGoogleApiConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Generate the Google OAuth2 consent URL */
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

/** Exchange an authorization code for tokens */
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

/** Find the next occurrence of a given day of the week */
function nextDayOfWeek(dayOfWeek: number): Date {
  const now = new Date();
  const diff = (dayOfWeek - now.getDay() + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  return next;
}

/**
 * Export classes to a specific Google Calendar.
 * @param calendarId — the calendar to add events to ("primary" or a specific ID)
 */
export async function exportClassesToCalendar(
  refreshToken: string,
  classes: IClassInfo[],
  calendarId: string = "primary",
  quarterEndDate?: string,
): Promise<{ eventsCreated: number; errors: string[] }> {
  const auth = getAuthedClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });
  const errors: string[] = [];
  let eventsCreated = 0;

  const endDate = quarterEndDate
    ? new Date(quarterEndDate)
    : new Date(Date.now() + 10 * 7 * 24 * 60 * 60 * 1000);
  const untilStr = endDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  // Get user's timezone
  let timeZone = "America/Los_Angeles";
  try {
    const settings = await calendar.settings.get({ setting: "timezone" });
    if (settings.data.value) timeZone = settings.data.value;
  } catch { /* use default */ }

  for (let i = 0; i < classes.length; i++) {
    const cls = classes[i];
    const colorId = CALENDAR_COLORS[i % CALENDAR_COLORS.length];

    for (const slot of cls.schedule) {
      const rruleDay = DAY_MAP[slot.dayOfWeek];
      if (!rruleDay) continue;

      const firstDate = nextDayOfWeek(slot.dayOfWeek);
      const dateStr = firstDate.toISOString().split("T")[0];

      try {
        await calendar.events.insert({
          calendarId,
          requestBody: {
            summary: `${cls.code}: ${cls.name}`,
            description: [
              cls.instructor ? `Instructor: ${cls.instructor}` : "",
              `Type: ${slot.type}`,
              cls.description || "",
            ].filter(Boolean).join("\n"),
            location: slot.location || undefined,
            colorId,
            start: { dateTime: `${dateStr}T${slot.startTime}:00`, timeZone },
            end: { dateTime: `${dateStr}T${slot.endTime}:00`, timeZone },
            recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${rruleDay};UNTIL=${untilStr}`],
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
