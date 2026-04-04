// ============================================================
// Single Todo API
// Drop into src/app/api/todos/[todoId]/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { todoProvider } from "@/lib/extensions/todo-provider";

export const PATCH = withAuth(async (req, _user, { params }) => {
  const { todoId } = await params;
  const body = await req.json();

  const updated = await todoProvider.updateTodo(todoId, body);
  if (!updated) {
    return Response.json({ error: "Todo not found" }, { status: 404 });
  }
  return Response.json({ todo: updated });
});

export const DELETE = withAuth(async (_req, _user, { params }) => {
  const { todoId } = await params;
  const deleted = await todoProvider.deleteTodo(todoId);
  if (!deleted) {
    return Response.json({ error: "Todo not found" }, { status: 404 });
  }
  return Response.json({ success: true });
});
