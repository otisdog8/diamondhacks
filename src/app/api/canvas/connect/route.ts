import { withAuth } from "@/lib/auth/middleware";
import { repo } from "@/lib/db";
import { startCanvasSession, startCrawlSession } from "@/lib/browser-use/canvas-scraper";
import { getClient } from "@/lib/browser-use/client";

// POST — Create or reuse a Canvas browser session, or start a direct crawl
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const { action, externalUrl, canvasUrl } = body;

    // Direct crawl — creates a new session and goes straight to the URL
    if (action === "crawl") {
      if (!externalUrl) {
        return Response.json({ error: "externalUrl is required" }, { status: 400 });
      }
      // Discard any existing active session first
      const existing = await repo.findActiveScrapeSessionByUser(user.id, "canvas");
      if (existing) {
        try {
          const client = getClient();
          await client.sessions.stop(existing.sessionId);
        } catch { /* best effort */ }
        await repo.updateScrapeSession(existing.id, { status: "failed", error: "Replaced by crawl" });
      }

      const result = await startCrawlSession(user, externalUrl);
      return Response.json(result);
    }

    // Normal Canvas connect — check for existing active session first
    const existing = await repo.findActiveScrapeSessionByUser(user.id, "canvas");
    if (existing) {
      return Response.json({
        scrapeSessionId: existing.id,
        liveUrl: existing.liveUrl,
        sessionId: existing.sessionId,
        status: existing.status,
        reused: true,
      });
    }

    const result = await startCanvasSession(user, canvasUrl || "https://canvas.ucsd.edu");
    return Response.json(result);
  } catch (error) {
    console.error("Canvas connect error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to start session" },
      { status: 500 }
    );
  }
});

// DELETE — Discard the current Canvas session
export const DELETE = withAuth(async (_req, user) => {
  try {
    const existing = await repo.findActiveScrapeSessionByUser(user.id, "canvas");
    if (!existing) {
      return Response.json({ success: true, message: "No active session" });
    }

    try {
      const client = getClient();
      await client.sessions.stop(existing.sessionId);
    } catch { /* best effort */ }

    await repo.updateScrapeSession(existing.id, { status: "failed", error: "Discarded by user" });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Canvas discard error:", error);
    return Response.json({ error: "Failed to discard session" }, { status: 500 });
  }
});
