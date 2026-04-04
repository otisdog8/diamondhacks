// ============================================================
// Single Lecture API
// Drop into src/app/api/lectures/[lectureId]/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { lectureProvider } from "@/lib/extensions/lecture-provider";

export const GET = withAuth(async (_req, user, { params }) => {
  const { lectureId } = await params;
  const lectures = await lectureProvider.getLecturesForClass(user.id, "");
  const lecture = lectures.find((l) => l.id === lectureId);
  if (!lecture) return Response.json({ error: "Lecture not found" }, { status: 404 });
  return Response.json({ lecture });
});

export const DELETE = withAuth(async (_req, _user, { params }) => {
  const { lectureId } = await params;
  const deleted = await lectureProvider.deleteLecture(lectureId);
  if (!deleted) return Response.json({ error: "Lecture not found" }, { status: 404 });
  return Response.json({ success: true });
});
