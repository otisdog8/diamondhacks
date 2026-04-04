import { withAuth } from "@/lib/auth/middleware";
import { repo } from "@/lib/db";
import { runCanvasScrape } from "@/lib/browser-use/canvas-scraper";

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    // Find active session
    const session = await repo.findActiveScrapeSessionByUser(user.id, "canvas");
    if (!session) {
      return Response.json({ status: "none" });
    }
    return Response.json({
      id: session.id,
      status: session.status,
      liveUrl: session.liveUrl,
      classesFound: session.classesFound,
      error: session.error,
    });
  }

  const session = await repo.findScrapeSession(sessionId);
  if (!session || session.userId !== user.id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  return Response.json({
    id: session.id,
    status: session.status,
    liveUrl: session.liveUrl,
    classesFound: session.classesFound,
    error: session.error,
  });
});

// POST triggers the actual scraping (after user confirms login)
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const { scrapeSessionId, canvasUrl } = body;

    if (!scrapeSessionId) {
      return Response.json({ error: "scrapeSessionId is required" }, { status: 400 });
    }

    const session = await repo.findScrapeSession(scrapeSessionId);
    if (!session || session.userId !== user.id) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    // Run scrape in background (don't await)
    runCanvasScrape(scrapeSessionId, canvasUrl || "https://canvas.ucsd.edu").catch(
      (err) => console.error("Scrape failed:", err)
    );

    return Response.json({ status: "scraping", message: "Scrape started" });
  } catch (error) {
    console.error("Canvas scrape trigger error:", error);
    return Response.json(
      { error: "Failed to start scrape" },
      { status: 500 }
    );
  }
});
