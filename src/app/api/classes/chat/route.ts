import { withAuth } from "@/lib/auth/middleware";
import { repo } from "@/lib/db";
import { callAI } from "@/lib/ai/openrouter";
import { assignmentProvider } from "@/lib/extensions/assignment-provider";
import { todoProvider } from "@/lib/extensions/todo-provider";

/**
 * POST /api/classes/chat
 * Body: { message: string }
 *
 * Uses AI to interpret a natural language edit and propose a structured
 * change to classes, assignments, or todos.
 */
export const POST = withAuth(async (req, user) => {
  try {
    const { message } = await req.json();
    if (!message?.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const classes = await repo.findClassesByUserId(user.id);
    const assignments = await assignmentProvider.getAllAssignments(user.id);
    const todos = await todoProvider.getAllTodos(user.id);

    // Build compact context
    const classContext = classes.map((cls) => ({
      id: cls.id,
      code: cls.code,
      name: cls.name,
      instructor: cls.instructor,
      schedule: cls.schedule.map((s, i) => ({
        index: i,
        day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][s.dayOfWeek],
        dayOfWeek: s.dayOfWeek,
        time: `${s.startTime}-${s.endTime}`,
        location: s.location,
        type: s.type,
        host: s.host,
      })),
    }));

    const assignmentContext = assignments.slice(0, 30).map((a) => ({
      id: a.id,
      classId: a.classId,
      title: a.title,
      dueDate: a.dueDate,
      points: a.points,
      type: a.type,
      completed: a.completed,
      milestones: a.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        dueDate: m.dueDate,
        completed: m.completed,
      })),
    }));

    const todoContext = todos.filter((t) => !t.completed).slice(0, 20).map((t) => ({
      id: t.id,
      classId: t.classId,
      title: t.title,
      dueDate: t.dueDate,
      completed: t.completed,
    }));

    // Map classId to code for readability
    const classMap: Record<string, string> = {};
    for (const c of classes) classMap[c.id] = c.code;

    const prompt = `You are a schedule and task editing assistant. The user can edit their class schedule, assignments, or todos.

CURRENT CLASSES:
${JSON.stringify(classContext, null, 2)}

ASSIGNMENTS (${assignmentContext.length} total):
${JSON.stringify(assignmentContext, null, 2)}

ACTIVE TODOS (${todoContext.length}):
${JSON.stringify(todoContext, null, 2)}

CLASS ID → CODE: ${JSON.stringify(classMap)}

USER REQUEST: "${message}"

Respond with a JSON object:
{
  "reply": "Short description of what you'll do (1-2 sentences)",
  "action": {
    "type": "edit_schedule" | "edit_assignment" | "delete_assignment" | "complete_assignment" | "edit_todo" | "delete_todo" | "complete_todo" | "create_todo" | "create_assignment",
    ...action-specific fields (see below)
  }
}

Set "action" to null if the request is unclear (ask for clarification in "reply").

ACTION TYPES:

1. edit_schedule: { type: "edit_schedule", classId: string, changes: { schedule: [...full updated schedule...] } }
   - To cancel a schedule entry: remove it from the array
   - To change location/time: update the matching entry
   - Include the FULL schedule array with the modification applied

2. edit_assignment: { type: "edit_assignment", assignmentId: string, changes: { title?, dueDate?, points?, type?, description?, completed? } }

3. delete_assignment: { type: "delete_assignment", assignmentId: string }

4. complete_assignment: { type: "complete_assignment", assignmentId: string, completed: boolean }

5. edit_todo: { type: "edit_todo", todoId: string, changes: { title?, dueDate?, completed?, description? } }

6. delete_todo: { type: "delete_todo", todoId: string }

7. complete_todo: { type: "complete_todo", todoId: string, completed: boolean }

8. create_todo: { type: "create_todo", classId: string, title: string, dueDate?: string, description?: string }

9. create_assignment: { type: "create_assignment", classId: string, title: string, dueDate?: string, points?: number, type?: string, description?: string }

RULES:
- dayOfWeek: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
- If ambiguous, ask for clarification
- For permanent schedule changes, warn the user
- Match assignments/todos by title if the user doesn't specify an ID
- Return ONLY valid JSON, no markdown`;

    const response = await callAI(prompt, { maxTokens: 2000, model: "google/gemini-3-flash-preview" });

    let parsed: { reply: string; action: Record<string, unknown> | null };
    try {
      const match = response.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");
      parsed = JSON.parse(match[0]);
    } catch {
      return Response.json({
        reply: "I had trouble understanding that. Could you rephrase?",
        action: null,
      });
    }

    // Backward compat: if the AI returns "patch" instead of "action"
    if (!parsed.action && (parsed as Record<string, unknown>).patch) {
      const patch = (parsed as Record<string, unknown>).patch as Record<string, unknown>;
      parsed.action = { type: "edit_schedule", classId: patch.classId, changes: patch.changes };
    }

    return Response.json(parsed);
  } catch (error) {
    console.error("Chat edit error:", error);
    return Response.json({ error: "Failed to process request" }, { status: 500 });
  }
});

/**
 * PATCH /api/classes/chat
 * Body: { action: { type: string, ...fields } }
 *
 * Applies a confirmed action from the chat.
 */
export const PATCH = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const action = body.action ?? body; // support both { action: {...} } and flat

    if (!action?.type) {
      // Legacy format: { classId, changes }
      if (body.classId && body.changes) {
        const cls = await repo.findClassById(body.classId);
        if (!cls || cls.userId !== user.id) {
          return Response.json({ error: "Class not found" }, { status: 404 });
        }
        const updated = await repo.updateClass(body.classId, body.changes);
        return Response.json({ success: true, class: updated });
      }
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    switch (action.type) {
      case "edit_schedule": {
        const cls = await repo.findClassById(action.classId as string);
        if (!cls || cls.userId !== user.id) {
          return Response.json({ error: "Class not found" }, { status: 404 });
        }
        const updated = await repo.updateClass(action.classId as string, action.changes as Record<string, unknown>);
        return Response.json({ success: true, class: updated });
      }

      case "edit_assignment": {
        const result = await assignmentProvider.updateAssignment(
          action.assignmentId as string,
          action.changes as Record<string, unknown>,
        );
        return Response.json({ success: !!result, assignment: result });
      }

      case "delete_assignment": {
        const deleted = await assignmentProvider.deleteAssignment(action.assignmentId as string);
        return Response.json({ success: deleted });
      }

      case "complete_assignment": {
        const result = await assignmentProvider.updateAssignment(
          action.assignmentId as string,
          { completed: action.completed as boolean },
        );
        return Response.json({ success: !!result, assignment: result });
      }

      case "edit_todo": {
        const result = await todoProvider.updateTodo(
          action.todoId as string,
          action.changes as Partial<{ title: string; dueDate: string; completed: boolean; description: string }>,
        );
        return Response.json({ success: !!result, todo: result });
      }

      case "delete_todo": {
        const deleted = await todoProvider.deleteTodo(action.todoId as string);
        return Response.json({ success: deleted });
      }

      case "complete_todo": {
        const result = await todoProvider.updateTodo(
          action.todoId as string,
          { completed: action.completed as boolean },
        );
        return Response.json({ success: !!result, todo: result });
      }

      case "create_todo": {
        const todo = await todoProvider.createTodo({
          userId: user.id,
          classId: (action.classId as string) || "general",
          title: action.title as string,
          description: action.description as string | undefined,
          dueDate: action.dueDate as string | undefined,
          completed: false,
          source: "manual",
        });
        return Response.json({ success: true, todo });
      }

      case "create_assignment": {
        const assignment = await assignmentProvider.createAssignment({
          userId: user.id,
          classId: action.classId as string,
          title: action.title as string,
          description: action.description as string | undefined,
          dueDate: action.dueDate as string | undefined,
          points: action.points as number | undefined,
          type: (action.assignmentType as "homework" | "project" | "exam" | "quiz" | "lab" | "other") ?? "homework",
          source: "manual",
          completed: false,
        });
        return Response.json({ success: true, assignment });
      }

      default:
        return Response.json({ error: `Unknown action type: ${action.type}` }, { status: 400 });
    }
  } catch (error) {
    console.error("Chat apply error:", error);
    return Response.json({ error: "Failed to apply changes" }, { status: 500 });
  }
});
