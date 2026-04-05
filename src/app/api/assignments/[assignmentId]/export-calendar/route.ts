// ============================================================
// Drop into src/app/api/assignments/[assignmentId]/export-calendar/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { assignmentProvider } from "@/lib/extensions/assignment-provider";

export const POST = withAuth(async (_req, user, { params }) => {
  const { assignmentId } = await params;
  try {
    const success = await assignmentProvider.exportToCalendar(assignmentId, user.id);
    return Response.json({ success });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calendar export failed";
    return Response.json({ error: message }, { status: 500 });
  }
});
