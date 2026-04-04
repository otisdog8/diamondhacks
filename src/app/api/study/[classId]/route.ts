// ============================================================
// Study Materials API
// Drop into src/app/api/study/[classId]/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { studyProvider } from "@/lib/extensions/study-provider";

// GET /api/study/[classId] — list all materials for a class
export const GET = withAuth(async (_req, user, { params }) => {
  const { classId } = await params;
  const materials = await studyProvider.getMaterialsForClass(user.id, classId);
  return Response.json({ materials });
});

// POST /api/study/[classId] — generate new material
// Body: { type: "flashcards" | "summary" }
export const POST = withAuth(async (req, user, { params }) => {
  const { classId } = await params;
  const body = await req.json();
  const { type } = body;

  if (type !== "flashcards" && type !== "summary") {
    return Response.json({ error: 'type must be "flashcards" or "summary"' }, { status: 400 });
  }

  try {
    const material =
      type === "flashcards"
        ? await studyProvider.generateFlashcards(user.id, classId)
        : await studyProvider.generateSummary(user.id, classId);

    return Response.json({ material }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
});
