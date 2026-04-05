// ============================================================
// Drop into src/app/api/assignments/sync/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { assignmentProvider } from "@/lib/extensions/assignment-provider";

export const POST = withAuth(async (req, user) => {
  const body = await req.json();
  const { classId, canvasUrl } = body;

  if (!classId || !canvasUrl) {
    return Response.json({ error: "classId and canvasUrl are required" }, { status: 400 });
  }

  try {
    const assignments = await assignmentProvider.syncFromCanvas(user.id, classId, canvasUrl);
    return Response.json({ assignments, synced: assignments.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return Response.json({ error: message }, { status: 500 });
  }
});
