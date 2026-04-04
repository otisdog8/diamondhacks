import { withAuth } from "@/lib/auth/middleware";
import { startGoogleCalendarSession } from "@/lib/browser-use/calendar-pusher";

export const POST = withAuth(async (_req, user) => {
  try {
    const result = await startGoogleCalendarSession(user);
    return Response.json(result);
  } catch (error) {
    console.error("Calendar connect error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to start calendar session" },
      { status: 500 }
    );
  }
});
