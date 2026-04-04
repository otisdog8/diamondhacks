// ============================================================
// Todos API
// Drop into src/app/api/todos/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { todoProvider } from "@/lib/extensions/todo-provider";

export const GET = withAuth(async (_req, user) => {
  const todos = await todoProvider.getAllTodos(user.id);
  return Response.json({ todos });
});

export const POST = withAuth(async (req, user) => {
  const body = await req.json();
  const { classId, title, description, dueDate } = body;

  if (!classId || !title) {
    return Response.json({ error: "classId and title are required" }, { status: 400 });
  }

  const todo = await todoProvider.createTodo({
    userId: user.id,
    classId,
    title,
    description,
    dueDate,
    completed: false,
    source: "manual",
  });

  return Response.json({ todo }, { status: 201 });
});
