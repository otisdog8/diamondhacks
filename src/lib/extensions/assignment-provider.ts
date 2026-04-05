import { v4 as uuidv4 } from "uuid";
import { repo } from "@/lib/db";
import { getClient } from "@/lib/browser-use/client";
import { readCollection, writeCollection } from "@/lib/db/json/store";
import { callAI } from "@/lib/ai/openrouter";
import { todoProvider } from "./todo-provider";
import type { IAssignment, IMilestone, IAssignmentProvider } from "./assignment-types";

const COLLECTION = "assignments";
const callClaude = callAI;

function now(): string {
  return new Date().toISOString();
}

function loadAll(): IAssignment[] {
  return readCollection<IAssignment>(COLLECTION);
}

function saveAll(assignments: IAssignment[]) {
  writeCollection(COLLECTION, assignments);
}

function findById(id: string): IAssignment | undefined {
  return loadAll().find((a) => a.id === id);
}

function upsert(assignment: IAssignment) {
  const all = loadAll();
  const idx = all.findIndex((a) => a.id === assignment.id);
  if (idx >= 0) all[idx] = assignment;
  else all.push(assignment);
  saveAll(all);
}

function removeById(id: string): boolean {
  const all = loadAll();
  const filtered = all.filter((a) => a.id !== id);
  if (filtered.length === all.length) return false;
  saveAll(filtered);
  return true;
}

function spreadMilestoneDates(dueDate: string, count: number): string[] {
  const due = new Date(dueDate).getTime();
  const start = Date.now();
  const gap = (due - start) / (count + 1);
  return Array.from({ length: count }, (_, i) =>
    new Date(start + gap * (i + 1)).toISOString().split("T")[0]
  );
}

export const assignmentProvider: IAssignmentProvider = {
  async getAssignmentsForClass(userId, classId) {
    return loadAll()
      .filter((a) => a.userId === userId && a.classId === classId)
      .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  },

  async getAllAssignments(userId) {
    return loadAll()
      .filter((a) => a.userId === userId)
      .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  },

  async createAssignment(data) {
    const assignment: IAssignment = {
      ...data,
      id: uuidv4(),
      milestones: [],
      calendarExported: false,
      createdAt: now(),
      updatedAt: now(),
    };
    upsert(assignment);
    return assignment;
  },

  async updateAssignment(id, updates) {
    const existing = findById(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: now() };
    upsert(updated);
    return updated;
  },

  async deleteAssignment(id) {
    return removeById(id);
  },

  async updateMilestone(assignmentId, milestoneId, updates) {
    const assignment = findById(assignmentId);
    if (!assignment) return null;
    const milestones = assignment.milestones.map((m) =>
      m.id === milestoneId ? { ...m, ...updates } : m
    );
    const updated = { ...assignment, milestones, updatedAt: now() };
    upsert(updated);

    // Sync completion to matching todo
    if (updates.completed !== undefined) {
      const allTodos = await todoProvider.getAllTodos(assignment.userId);
      const matchingTodo = allTodos.find(
        (t) => t.canvasAssignmentId === `milestone-${milestoneId}`
      );
      if (matchingTodo) {
        await todoProvider.updateTodo(matchingTodo.id, { completed: updates.completed });
      }
    }

    return updated;
  },

  async generateMilestones(assignmentId, extraContext) {
    const assignment = findById(assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    const cls = await repo.findClassById(assignment.classId);
    const courseName = cls ? `${cls.code} — ${cls.name}` : "Unknown course";

    const daysUntilDue = assignment.dueDate
      ? Math.ceil((new Date(assignment.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 14;

    const count =
      assignment.type === "project" ? 5 :
      assignment.type === "exam" ? 4 :
      daysUntilDue > 7 ? 3 : 2;

    const prompt = `You are a study coach helping a student break down an assignment into milestones.

Course: ${courseName}
Assignment: ${assignment.title}
Type: ${assignment.type}
Due: ${assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "No due date"}
Days until due: ${daysUntilDue}
${assignment.description ? `Description: ${assignment.description}` : ""}
${extraContext ? `\nAdditional details from the student:\n${extraContext.slice(0, 4000)}` : ""}

Generate exactly ${count} milestones that will help the student complete this assignment step by step.
Each milestone should be a concrete, actionable task that builds toward the final submission.

Return ONLY a JSON array with exactly ${count} objects, each with:
- "title": short action-oriented title (max 8 words)
- "description": 1-2 sentence explanation of what to do

No other text, no markdown, no code blocks. Just the raw JSON array.

Example format:
[{"title":"Read and annotate all sources","description":"Gather all required readings and highlight key arguments you want to reference."},{"title":"Create detailed outline","description":"Structure your argument with section headers and bullet points for each paragraph."}]`;

    const response = await callClaude(prompt);

    let rawMilestones: Array<{ title: string; description: string }> = [];
    try {
      const match = response.match(/\[[\s\S]*\]/);
      if (match) rawMilestones = JSON.parse(match[0]);
    } catch {
      throw new Error("Failed to parse AI milestone response");
    }

    const dueStr = assignment.dueDate ?? new Date(Date.now() + 14 * 86_400_000).toISOString().split("T")[0];
    const dates = spreadMilestoneDates(dueStr, rawMilestones.length);

    const milestones: IMilestone[] = rawMilestones.map((m, i) => ({
      id: uuidv4(),
      title: m.title,
      description: m.description,
      dueDate: dates[i],
      completed: false,
      order: i + 1,
    }));

    const updated = { ...assignment, milestones, updatedAt: now() };
    upsert(updated);

    // Create a todo for each milestone
    for (const m of milestones) {
      await todoProvider.createTodo({
        userId: assignment.userId,
        classId: assignment.classId,
        title: `${cls?.code ?? ""}: ${m.title}`,
        description: `${assignment.title} — ${m.description}`,
        dueDate: m.dueDate,
        completed: false,
        source: "canvas",
        canvasAssignmentId: `milestone-${m.id}`,
      });
    }

    // Also create a todo for the assignment due date itself
    await todoProvider.createTodo({
      userId: assignment.userId,
      classId: assignment.classId,
      title: `${cls?.code ?? ""}: ${assignment.title} DUE`,
      description: `Assignment due`,
      dueDate: assignment.dueDate,
      completed: false,
      source: "canvas",
      canvasAssignmentId: `due-${assignment.id}`,
    });

    return updated;
  },

  async syncFromCanvas(userId, classId, _canvasUrl) {
    const cls = await repo.findClassById(classId);
    if (!cls) throw new Error("Class not found");

    const rawData = cls.rawData as Record<string, string> | undefined;
    const syllabusText = rawData?.syllabusText ?? "";
    const rawNotes = rawData?.rawNotes ?? "";
    const description = cls.description ?? "";

    const combinedText = [syllabusText, rawNotes, description].filter(Boolean).join("\n\n");
    if (!combinedText.trim()) {
      throw new Error("No scraped data available for this class. Try re-importing from Canvas first.");
    }

    const prompt = `Extract all assignments, exams, quizzes, essays, projects, and deadlines from this class information for ${cls.code} (${cls.name}).

Here is all the scraped data:
${combinedText.slice(0, 6000)}

For each assignment/deadline found, return:
- id: a short unique identifier (e.g. "essay1", "midterm", "hw3")
- title: the assignment name
- description: brief description if available (string or null)
- dueDate: due date in ISO 8601 format YYYY-MM-DD (string or null). If only a rough date like "Week 5" is given, estimate based on a quarter starting 2026-03-30.
- points: point value as a number if mentioned (number or null)
- type: one of "homework", "project", "exam", "quiz", "lab", "other"

Return ONLY a JSON array, no other text. If no assignments are found, return [].`;

    const response = await callClaude(prompt);

    let scraped: Array<{
      id: string;
      title: string;
      description?: string;
      dueDate?: string;
      points?: number;
      type: IAssignment["type"];
    }> = [];

    try {
      const match = response.match(/\[[\s\S]*\]/);
      if (match) scraped = JSON.parse(match[0]);
    } catch {
      console.error("Failed to parse assignment extraction response");
    }

    const allExisting = loadAll();
    const created: IAssignment[] = [];
    for (const a of scraped) {
      const aId = a.id || "";
      const exists = allExisting.find(
        (ex) =>
          ex.userId === userId &&
          ex.classId === classId &&
          ((aId && ex.canvasAssignmentId && ex.canvasAssignmentId === aId) || ex.title === a.title)
      );
      if (exists) continue;
      if (!a.title) continue;

      const assignment = await assignmentProvider.createAssignment({
        userId,
        classId,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate || undefined,
        points: a.points,
        type: a.type ?? "homework",
        source: "canvas",
        canvasAssignmentId: aId || undefined,
        completed: false,
      });
      created.push(assignment);
    }

    return created;
  },

  async exportToCalendar(assignmentId, userId) {
    const assignment = findById(assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    const cls = await repo.findClassById(assignment.classId);
    const profile = await repo.findProfileByUserAndService(userId, "google");
    if (!profile?.profileId) {
      throw new Error("No Google Calendar session found. Please connect Google Calendar first.");
    }

    const client = getClient();
    const session = await client.sessions.create({ profileId: profile.profileId });

    try {
      const events = [
        {
          title: `DUE: ${assignment.title}`,
          date: assignment.dueDate,
          description: `${cls?.code ?? ""} assignment due today.\n${assignment.description ?? ""}`,
        },
        ...assignment.milestones.map((m) => ({
          title: m.title,
          date: m.dueDate,
          description: `Milestone for ${assignment.title} (${cls?.code ?? ""}): ${m.description}`,
        })),
      ];

      const task = `
        Go to https://calendar.google.com/calendar/r/month.
        Create the following Google Calendar all-day events one by one:
        ${events.map((e, i) => `${i + 1}. Title: "${e.title}" | Date: ${e.date} | Description: "${e.description}"`).join("\n")}
        Create each as an all-day event with the description included.
      `;

      const run = client.run(task, { sessionId: session.id, model: "bu-mini" });
      for await (const _step of run) { /* progress */ }

      const updated = { ...assignment, calendarExported: true, updatedAt: now() };
      upsert(updated);
      return true;
    } finally {
      await client.sessions.stop(session.id);
    }
  },
};
