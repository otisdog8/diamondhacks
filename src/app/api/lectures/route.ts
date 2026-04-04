// ============================================================
// Lectures API
// Drop into src/app/api/lectures/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { lectureProvider } from "@/lib/extensions/lecture-provider";

// GET /api/lectures?classId=xxx — list lectures for a class
export const GET = withAuth(async (req, user) => {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");

  if (!classId) {
    return Response.json({ error: "classId query param is required" }, { status: 400 });
  }

  const lectures = await lectureProvider.getLecturesForClass(user.id, classId);
  return Response.json({ lectures });
});

// POST /api/lectures — add a new lecture and kick off processing
// Body: { classId, videoUrl, title }
export const POST = withAuth(async (req, user) => {
  const body = await req.json();
  const { classId, videoUrl, title } = body;

  if (!classId || !videoUrl || !title) {
    return Response.json(
      { error: "classId, videoUrl, and title are required" },
      { status: 400 }
    );
  }

  // Create the lecture record immediately
  const lecture = await lectureProvider.addLecture(user.id, classId, videoUrl, title);

  // Kick off processing in the background (don't await — respond immediately)
  lectureProvider.processLecture(lecture.id).catch((err) => {
    console.error(`Failed to process lecture ${lecture.id}:`, err);
  });

  return Response.json({ lecture }, { status: 202 });
});
