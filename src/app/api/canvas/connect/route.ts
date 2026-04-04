import { withAuth } from "@/lib/auth/middleware";
import { startCanvasSession } from "@/lib/browser-use/canvas-scraper";

export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const canvasUrl = body.canvasUrl || "https://canvas.ucsd.edu";

    const result = await startCanvasSession(user, canvasUrl);

    return Response.json(result);
  } catch (error) {
    console.error("Canvas connect error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to start Canvas session" },
      { status: 500 }
    );
  }
});
