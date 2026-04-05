// ============================================================
// Drop into src/app/api/assignments/[assignmentId]/milestones/[milestoneId]/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { assignmentProvider } from "@/lib/extensions/assignment-provider";

export const PATCH = withAuth(async (req, _user, { params }) => {
  const { assignmentId, milestoneId } = await params;
  const body = await req.json();
  const updated = await assignmentProvider.updateMilestone(assignmentId, milestoneId, body);
  if (!updated) return Response.json({ error: "Assignment or milestone not found" }, { status: 404 });
  return Response.json({ assignment: updated });
});
