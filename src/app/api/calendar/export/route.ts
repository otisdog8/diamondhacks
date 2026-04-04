import { withAuth } from "@/lib/auth/middleware";
import { repo } from "@/lib/db";
import { exportClassesToCalendar } from "@/lib/google/calendar";
import { exportToGoogleCalendar } from "@/lib/browser-use/calendar-pusher";

/**
 * POST /api/calendar/export
 *
 * Body: { calendarId?, scrapeSessionId? }
 *
 * Uses Google Calendar API if the user has OAuth tokens.
 * Quarter dates are read from class data (set by the scraper).
 * Falls back to Browser Use if scrapeSessionId is provided.
 */
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const classes = await repo.findClassesByUserId(user.id);
    const enabledClasses = classes.filter((c) => c.enabled);

    if (enabledClasses.length === 0) {
      return Response.json({ success: true, eventsCreated: 0, method: "none" });
    }

    // Strategy 1: Google Calendar API
    if (user.googleRefreshToken) {
      try {
        const result = await exportClassesToCalendar(
          user.googleRefreshToken,
          enabledClasses,
          body.calendarId || "primary",
        );
        return Response.json({
          success: true,
          method: "api",
          eventsCreated: result.eventsCreated,
          errors: result.errors,
        });
      } catch (err) {
        console.error("Google Calendar API export failed:", err);
        // Clear revoked/expired tokens
        if (err instanceof Error && (err.message.includes("invalid_grant") || err.message.includes("Token has been expired"))) {
          await repo.updateUser(user.id, { googleRefreshToken: undefined });
        }
        // Fall through to Browser Use
      }
    }

    // Strategy 2: Browser Use fallback
    const { scrapeSessionId } = body;
    if (!scrapeSessionId) {
      return Response.json(
        { error: "No Google API tokens and no scrapeSessionId for Browser Use fallback" },
        { status: 400 }
      );
    }

    exportToGoogleCalendar(scrapeSessionId, user).catch((err) =>
      console.error("Calendar export failed:", err)
    );

    return Response.json({ status: "exporting", method: "browser-use", message: "Calendar export started" });
  } catch (error) {
    console.error("Calendar export error:", error);
    return Response.json({ error: "Failed to export to calendar" }, { status: 500 });
  }
});
