import { withAuth } from "@/lib/auth/middleware";
import { listCalendars } from "@/lib/google/calendar";

/**
 * GET /api/calendar/calendars
 *
 * Returns the list of Google Calendars the user can write to.
 * Requires the user to have a stored Google refresh token.
 */
export const GET = withAuth(async (_req, user) => {
  if (!user.googleRefreshToken) {
    return Response.json({ error: "Not connected to Google" }, { status: 401 });
  }

  try {
    const calendars = await listCalendars(user.googleRefreshToken);
    return Response.json({ calendars });
  } catch (error) {
    console.error("List calendars error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to list calendars" },
      { status: 500 }
    );
  }
});
