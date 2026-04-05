// ============================================================
// Drop into src/app/api/assignments/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { assignmentProvider } from "@/lib/extensions/assignment-provider";

// GET /api/assignments?classId=xxx
export const GET = withAuth(async (req, user) => {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");

  const assignments = classId
    ? await assignmentProvider.getAssignmentsForClass(user.id, classId)
    : await assignmentProvider.getAllAssignments(user.id);

  return Response.json({ assignments });
});

// POST /api/assignments
export const POST = withAuth(async (req, user) => {
  const body = await req.json();
  const { classId, title, description, dueDate, points, type } = body;

  if (!classId || !title || !dueDate) {
    return Response.json(
      { error: "classId, title, and dueDate are required" },
      { status: 400 }
    );
  }

  const assignment = await assignmentProvider.createAssignment({
    userId: user.id,
    classId,
    title,
    description,
    dueDate,
    points,
    type: type ?? "homework",
    source: "manual",
    completed: false,
  });

  return Response.json({ assignment }, { status: 201 });
});
