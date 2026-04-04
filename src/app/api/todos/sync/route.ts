// ============================================================
// Canvas Sync for Todos
// Drop into src/app/api/todos/sync/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { todoProvider } from "@/lib/extensions/todo-provider";

export const POST = withAuth(async (req, user) => {
  const body = await req.json();
  const { classId, canvasUrl } = body;

  if (!classId || !canvasUrl) {
    return Response.json({ error: "classId and canvasUrl are required" }, { status: 400 });
  }

  try {
    const todos = await todoProvider.syncFromCanvas(user.id, classId, canvasUrl);
    return Response.json({ todos, synced: todos.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return Response.json({ error: message }, { status: 500 });
  }
});
