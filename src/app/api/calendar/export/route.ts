import { withAuth } from "@/lib/auth/middleware";
import { exportToGoogleCalendar } from "@/lib/browser-use/calendar-pusher";

export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const { scrapeSessionId } = body;

    if (!scrapeSessionId) {
      return Response.json({ error: "scrapeSessionId is required" }, { status: 400 });
    }

    // Run export in background
    exportToGoogleCalendar(scrapeSessionId, user).catch((err) =>
      console.error("Calendar export failed:", err)
    );

    return Response.json({ status: "exporting", message: "Calendar export started" });
  } catch (error) {
    console.error("Calendar export error:", error);
    return Response.json(
      { error: "Failed to export to calendar" },
      { status: 500 }
    );
  }
});
