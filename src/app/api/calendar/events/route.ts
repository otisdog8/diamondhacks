import { withAuth } from "@/lib/auth/middleware";
import { fetchCalendarEvents } from "@/lib/google/calendar";

/**
 * GET /api/calendar/events?calendarId=...&timeMin=...&timeMax=...
 *
 * Fetches events from the user's Google Calendar.
 */
export const GET = withAuth(async (req, user) => {
  if (!user.googleRefreshToken) {
    return Response.json({ connected: false, events: [] });
  }

  const url = new URL(req.url);
  const calendarId = url.searchParams.get("calendarId") || "primary";
  const timeMin = url.searchParams.get("timeMin") || undefined;
  const timeMax = url.searchParams.get("timeMax") || undefined;

  try {
    const events = await fetchCalendarEvents(
      user.googleRefreshToken,
      calendarId,
      timeMin,
      timeMax,
    );
    return Response.json({ connected: true, events });
  } catch (error) {
    console.error("Fetch calendar events error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch events" },
      { status: 500 }
    );
  }
});
