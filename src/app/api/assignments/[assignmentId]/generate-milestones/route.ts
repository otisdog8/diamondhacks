// ============================================================
// Drop into src/app/api/assignments/[assignmentId]/generate-milestones/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { assignmentProvider } from "@/lib/extensions/assignment-provider";

export const POST = withAuth(async (_req, _user, { params }) => {
  const { assignmentId } = await params;
  try {
    const assignment = await assignmentProvider.generateMilestones(assignmentId);
    return Response.json({ assignment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate milestones";
    return Response.json({ error: message }, { status: 500 });
  }
});
