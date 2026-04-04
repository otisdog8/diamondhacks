import { withAuth } from "@/lib/auth/middleware";
import { repo } from "@/lib/db";
import { isGoogleApiConfigured, getAuthUrl } from "@/lib/google/calendar";
import { startGoogleCalendarSession } from "@/lib/browser-use/calendar-pusher";

/**
 * POST /api/calendar/connect
 *
 * 1. User has Google refresh token → {method: "api", connected: true}
 * 2. Google OAuth configured → {method: "api", authUrl: "..."}
 * 3. Otherwise → Browser Use fallback
 */
export const POST = withAuth(async (_req, user) => {
  try {
    if (user.googleRefreshToken) {
      return Response.json({ method: "api", connected: true });
    }

    if (isGoogleApiConfigured()) {
      const authUrl = getAuthUrl(user.id);
      if (authUrl) {
        return Response.json({ method: "api", authUrl });
      }
    }

    // Fallback: Browser Use
    const result = await startGoogleCalendarSession(user);
    return Response.json({ method: "browser-use", ...result });
  } catch (error) {
    console.error("Calendar connect error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to start calendar session" },
      { status: 500 }
    );
  }
});

/** DELETE — disconnect Google Calendar (clear refresh token) */
export const DELETE = withAuth(async (_req, user) => {
  try {
    await repo.updateUser(user.id, { googleRefreshToken: undefined });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Calendar disconnect error:", error);
    return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  }
});
