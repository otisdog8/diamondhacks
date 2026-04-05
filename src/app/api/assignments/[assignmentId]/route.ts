// ============================================================
// Drop into src/app/api/assignments/[assignmentId]/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { assignmentProvider } from "@/lib/extensions/assignment-provider";

export const PATCH = withAuth(async (req, _user, { params }) => {
  const { assignmentId } = await params;
  const body = await req.json();
  const updated = await assignmentProvider.updateAssignment(assignmentId, body);
  if (!updated) return Response.json({ error: "Assignment not found" }, { status: 404 });
  return Response.json({ assignment: updated });
});

export const DELETE = withAuth(async (_req, _user, { params }) => {
  const { assignmentId } = await params;
  const deleted = await assignmentProvider.deleteAssignment(assignmentId);
  if (!deleted) return Response.json({ error: "Assignment not found" }, { status: 404 });
  return Response.json({ success: true });
});
