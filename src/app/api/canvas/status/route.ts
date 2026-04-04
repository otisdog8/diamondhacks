import { withAuth } from "@/lib/auth/middleware";
import { repo } from "@/lib/db";
import { runCanvasScrape, resumeCanvasScrape, confirmScrapeResults, deeperScrape, crawlExternalUrl } from "@/lib/browser-use/canvas-scraper";
import { getClient } from "@/lib/browser-use/client";

// GET — Poll session status with live Browser Use progress
export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");

  let session;
  if (sessionId) {
    session = await repo.findScrapeSession(sessionId);
    if (!session || session.userId !== user.id) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }
  } else {
    session = await repo.findActiveScrapeSessionByUser(user.id, "canvas");
    if (!session) {
      return Response.json({ status: "none" });
    }
  }

  // Enrich active sessions with live Browser Use progress
  if (session.status === "connecting" || session.status === "scraping" || session.status === "needs_login") {
    try {
      const client = getClient();
      const buSession = await client.sessions.get(session.sessionId);

      const stepCount = buSession.stepCount ?? session.stepCount ?? 0;
      const lastStepSummary = buSession.lastStepSummary ?? session.lastStepSummary;

      if (session.status === "connecting") {
        const summary = buSession.status === "running"
          ? (lastStepSummary || "Navigating to Canvas...")
          : lastStepSummary;
        await repo.updateScrapeSession(session.id, { stepCount, lastStepSummary: summary });
      }

      if (session.status === "scraping") {
        await repo.updateScrapeSession(session.id, { stepCount, lastStepSummary });
      }

      if (buSession.status === "error" || buSession.status === "timed_out") {
        await repo.updateScrapeSession(session.id, {
          status: "failed",
          stepCount,
          lastStepSummary,
          error: buSession.status === "error" ? "Browser Use agent error" : "Session timed out",
        });
      }

      session = (await repo.findScrapeSession(session.id))!;
    } catch {
      // Can't reach BU — return what we have
    }
  }

  return Response.json({
    id: session.id,
    status: session.status,
    liveUrl: session.liveUrl,
    stepCount: session.stepCount,
    lastStepSummary: session.lastStepSummary,
    classesFound: session.classesFound,
    rawOutput: session.rawOutput,
    error: session.error,
  });
});

// POST — Trigger scraping, resume, confirm, or search harder
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const { scrapeSessionId, canvasUrl, action } = body;

    if (!scrapeSessionId) {
      return Response.json({ error: "scrapeSessionId is required" }, { status: 400 });
    }

    const session = await repo.findScrapeSession(scrapeSessionId);
    if (!session || session.userId !== user.id) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const url = canvasUrl || "https://canvas.ucsd.edu";

    // Resume after external login
    if (action === "resume" && session.status === "needs_login") {
      resumeCanvasScrape(scrapeSessionId, url).catch(
        (err) => console.error("Resume scrape failed:", err)
      );
      return Response.json({ status: "scraping", message: "Scrape resumed" });
    }

    // Confirm review results — stop session, finalize
    if (action === "confirm" && session.status === "review") {
      await confirmScrapeResults(scrapeSessionId);
      return Response.json({ status: "completed", message: "Results confirmed" });
    }

    // Search harder — send another scrape task to the same session
    if (action === "deeper" && session.status === "review") {
      deeperScrape(scrapeSessionId, url).catch(
        (err) => console.error("Deeper scrape failed:", err)
      );
      return Response.json({ status: "scraping", message: "Deeper scrape started" });
    }

    // Crawl an external URL for class info
    if (action === "crawl" && session.status === "review") {
      const { externalUrl } = body;
      if (!externalUrl) {
        return Response.json({ error: "externalUrl is required" }, { status: 400 });
      }
      crawlExternalUrl(scrapeSessionId, externalUrl).catch(
        (err) => console.error("External crawl failed:", err)
      );
      return Response.json({ status: "scraping", message: "External crawl started" });
    }

    // Initial scrape trigger
    runCanvasScrape(scrapeSessionId, url).catch(
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
