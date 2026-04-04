// ============================================================
// Reprocess Lecture
// Drop into src/app/api/lectures/[lectureId]/process/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { lectureProvider } from "@/lib/extensions/lecture-provider";

export const POST = withAuth(async (_req, _user, { params }) => {
  const { lectureId } = await params;
  try {
    const lecture = await lectureProvider.processLecture(lectureId);
    return Response.json({ lecture });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    return Response.json({ error: message }, { status: 500 });
  }
});
