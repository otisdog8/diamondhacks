// ============================================================
// ITodoProvider implementation
// Drop into src/lib/extensions/todo-provider.ts
// ============================================================
import { v4 as uuidv4 } from "uuid";
import { repo } from "@/lib/db";
import { browserUseApi } from "@/lib/browser-use/client";
import type { ITodo, ITodoProvider } from "./types";

// In-memory store (JSON dev mode) — swapped for MongoDB in production
// We piggyback on the existing repo's rawData field or store in a separate JSON file.
// For simplicity, todos are stored as a JSON sidecar via the same pattern as other models.
// In production (mongo mode) you'd add a Todos collection; for dev we use an in-process map.

const todosStore = new Map<string, ITodo>();

function now(): string {
  return new Date().toISOString();
}

export const todoProvider: ITodoProvider = {
  async getTodosForClass(userId, classId) {
    return [...todosStore.values()].filter(
      (t) => t.userId === userId && t.classId === classId
    );
  },

  async getAllTodos(userId) {
    return [...todosStore.values()]
      .filter((t) => t.userId === userId)
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  },

  async createTodo(data) {
    const todo: ITodo = {
      ...data,
      id: uuidv4(),
      createdAt: now(),
    };
    todosStore.set(todo.id, todo);
    return todo;
  },

  async updateTodo(id, updates) {
    const existing = todosStore.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    todosStore.set(id, updated);
    return updated;
  },

  async deleteTodo(id) {
    return todosStore.delete(id);
  },

  async syncFromCanvas(userId, classId, canvasUrl) {
    // Get the class to find canvasId
    const cls = await repo.findClassById(classId);
    if (!cls) throw new Error("Class not found");

    // Find an existing browser profile for this user
    const profile = await repo.findBrowserProfileByUserId(userId);
    if (!profile?.canvasProfileId) {
      throw new Error("No Canvas session found. Please connect Canvas first.");
    }

    // Start a short Browser Use session using the saved Canvas profile
    const session = await browserUseApi.sessions.create({
      profileId: profile.canvasProfileId,
    });

    try {
      const task = `
        Go to ${canvasUrl}/courses/${cls.canvasId}/assignments.
        Find all assignments that have a due date.
        Return a JSON array of objects with these fields:
          - id: the Canvas assignment ID (string)
          - title: assignment name (string)
          - description: short description if available (string or null)
          - dueDate: due date in ISO 8601 format (string or null)
        Return ONLY the JSON array, no other text.
      `;

      const result = await browserUseApi.run(task, {
        sessionId: session.id,
        model: "claude-sonnet-4-6",
      });

      // Parse the result
      let assignments: Array<{
        id: string;
        title: string;
        description?: string;
        dueDate?: string;
      }> = [];

      try {
        const text = result?.output ?? result?.result ?? "";
        const match = text.match(/\[[\s\S]*\]/);
        if (match) assignments = JSON.parse(match[0]);
      } catch {
        console.error("Failed to parse Canvas assignments JSON", result);
      }

      // Upsert todos from assignments
      const created: ITodo[] = [];
      for (const assignment of assignments) {
        // Check if we already have this assignment
        const existing = [...todosStore.values()].find(
          (t) =>
            t.userId === userId &&
            t.classId === classId &&
            t.canvasAssignmentId === assignment.id
        );
        if (existing) continue;

        const todo = await todoProvider.createTodo({
          userId,
          classId,
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.dueDate ?? undefined,
          completed: false,
          source: "canvas",
          canvasAssignmentId: assignment.id,
        });
        created.push(todo);
      }

      return created;
    } finally {
      await browserUseApi.sessions.stop(session.id);
    }
  },
};
