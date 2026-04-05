import { v4 as uuidv4 } from "uuid";
import { repo } from "@/lib/db";
import { getClient } from "@/lib/browser-use/client";
import { readCollection, writeCollection } from "@/lib/db/json/store";
import type { ITodo, ITodoProvider } from "./types";

const COLLECTION = "todos";

function now(): string {
  return new Date().toISOString();
}

function loadAll(): ITodo[] {
  return readCollection<ITodo>(COLLECTION);
}

function saveAll(todos: ITodo[]) {
  writeCollection(COLLECTION, todos);
}

function upsert(todo: ITodo) {
  const all = loadAll();
  const idx = all.findIndex((t) => t.id === todo.id);
  if (idx >= 0) all[idx] = todo;
  else all.push(todo);
  saveAll(all);
}

export const todoProvider: ITodoProvider = {
  async getTodosForClass(userId, classId) {
    return loadAll().filter(
      (t) => t.userId === userId && t.classId === classId
    );
  },

  async getAllTodos(userId) {
    return loadAll()
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
    upsert(todo);
    return todo;
  },

  async updateTodo(id, updates) {
    const all = loadAll();
    const existing = all.find((t) => t.id === id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    upsert(updated);
    return updated;
  },

  async deleteTodo(id) {
    const all = loadAll();
    const filtered = all.filter((t) => t.id !== id);
    if (filtered.length === all.length) return false;
    saveAll(filtered);
    return true;
  },

  async syncFromCanvas(userId, classId, canvasUrl) {
    const cls = await repo.findClassById(classId);
    if (!cls) throw new Error("Class not found");

    const profile = await repo.findProfileByUserAndService(userId, "canvas");
    if (!profile) {
      throw new Error("No Canvas session found. Please connect Canvas first.");
    }

    const session = await getClient().sessions.create({
      profileId: profile.profileId,
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

      const result = await getClient().run(task, {
        sessionId: session.id,
        model: "bu-max",
      });

      let assignments: Array<{
        id: string;
        title: string;
        description?: string;
        dueDate?: string;
      }> = [];

      try {
        const text = result?.output ?? "";
        const match = text.match(/\[[\s\S]*\]/);
        if (match) assignments = JSON.parse(match[0]);
      } catch {
        console.error("Failed to parse Canvas assignments JSON", result);
      }

      const allExisting = loadAll();
      const created: ITodo[] = [];
      for (const assignment of assignments) {
        const aId = assignment.id || "";
        const exists = allExisting.find(
          (t) =>
            t.userId === userId &&
            t.classId === classId &&
            ((aId && t.canvasAssignmentId && t.canvasAssignmentId === aId) || t.title === assignment.title)
        );
        if (exists) continue;

        const todo = await todoProvider.createTodo({
          userId,
          classId,
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.dueDate ?? undefined,
          completed: false,
          source: "canvas",
          canvasAssignmentId: aId || undefined,
        });
        created.push(todo);
      }

      return created;
    } finally {
      await getClient().sessions.stop(session.id);
    }
  },
};
