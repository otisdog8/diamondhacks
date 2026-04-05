// ============================================================
// IAssignmentProvider implementation
// Drop into src/lib/extensions/assignment-provider.ts
// ============================================================
import { v4 as uuidv4 } from "uuid";
import { repo } from "@/lib/db";
import { getClient } from "@/lib/browser-use/client";
import type { IAssignment, IMilestone, IAssignmentProvider } from "./assignment-types";

const assignmentsStore = new Map<string, IAssignment>();

function now(): string {
  return new Date().toISOString();
}

// Spread N milestones evenly between today and the due date
function spreadMilestoneDates(dueDate: string, count: number): string[] {
  const due = new Date(dueDate).getTime();
  const start = Date.now();
  const gap = (due - start) / (count + 1);
  return Array.from({ length: count }, (_, i) =>
    new Date(start + gap * (i + 1)).toISOString().split("T")[0]
  );
}

async function callClaude(prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

export const assignmentProvider: IAssignmentProvider = {
  async getAssignmentsForClass(userId, classId) {
    return [...assignmentsStore.values()]
      .filter((a) => a.userId === userId && a.classId === classId)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },

  async getAllAssignments(userId) {
    return [...assignmentsStore.values()]
      .filter((a) => a.userId === userId)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
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
    assignmentsStore.set(assignment.id, assignment);
    return assignment;
  },

  async updateAssignment(id, updates) {
    const existing = assignmentsStore.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: now() };
    assignmentsStore.set(id, updated);
    return updated;
  },

  async deleteAssignment(id) {
    return assignmentsStore.delete(id);
  },

  async updateMilestone(assignmentId, milestoneId, updates) {
    const assignment = assignmentsStore.get(assignmentId);
    if (!assignment) return null;
    const milestones = assignment.milestones.map((m) =>
      m.id === milestoneId ? { ...m, ...updates } : m
    );
    const updated = { ...assignment, milestones, updatedAt: now() };
    assignmentsStore.set(assignmentId, updated);
    return updated;
  },

  async generateMilestones(assignmentId) {
    const assignment = assignmentsStore.get(assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    const cls = await repo.findClassById(assignment.classId);
    const courseName = cls ? `${cls.code} — ${cls.name}` : "Unknown course";

    const daysUntilDue = Math.ceil(
      (new Date(assignment.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Decide how many milestones based on days until due and type
    const count =
      assignment.type === "project" ? 5 :
      assignment.type === "exam" ? 4 :
      daysUntilDue > 7 ? 3 : 2;

    const prompt = `You are a study coach helping a student break down an assignment into milestones.

Course: ${courseName}
Assignment: ${assignment.title}
Type: ${assignment.type}
Due: ${new Date(assignment.dueDate).toLocaleDateString()}
Days until due: ${daysUntilDue}
${assignment.description ? `Description: ${assignment.description}` : ""}

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

    const dates = spreadMilestoneDates(assignment.dueDate, rawMilestones.length);

    const milestones: IMilestone[] = rawMilestones.map((m, i) => ({
      id: uuidv4(),
      title: m.title,
      description: m.description,
      dueDate: dates[i],
      completed: false,
      order: i + 1,
    }));

    const updated = { ...assignment, milestones, updatedAt: now() };
    assignmentsStore.set(assignmentId, updated);
    return updated;
  },

  async syncFromCanvas(userId, classId, canvasUrl) {
    const cls = await repo.findClassById(classId);
    if (!cls) throw new Error("Class not found");

    const profile = await repo.findProfileByUserAndService(userId, "canvas");
    if (!profile?.profileId) {
      throw new Error("No Canvas session found. Please connect Canvas first.");
    }

    const client = getClient();
    const session = await client.sessions.create({ profileId: profile.profileId });

    try {
      const task = `
        Go to ${canvasUrl}/courses/${cls.canvasId}/assignments.
        Find ALL assignments listed on this page.
        For each assignment return:
          - id: Canvas assignment ID (string)
          - title: assignment name (string)
          - description: brief description if shown (string or null)
          - dueDate: due date in ISO 8601 format YYYY-MM-DD (string or null)
          - points: point value as a number (number or null)
          - type: one of "homework", "project", "exam", "quiz", "lab", "other"
        Return ONLY a JSON array, no other text.
      `;

      const run = client.run(task, { sessionId: session.id, model: "bu-mini" });
      // Drain the async iterable
      for await (const _step of run) { /* progress steps */ }
      const result = run.result;

      let scraped: Array<{
        id: string;
        title: string;
        description?: string;
        dueDate?: string;
        points?: number;
        type: IAssignment["type"];
      }> = [];

      try {
        const text = result?.output ?? "";
        const match = text.match(/\[[\s\S]*\]/);
        if (match) scraped = JSON.parse(match[0]);
      } catch {
        console.error("Failed to parse Canvas assignments", result);
      }

      const created: IAssignment[] = [];
      for (const a of scraped) {
        const exists = [...assignmentsStore.values()].find(
          (ex) =>
            ex.userId === userId &&
            ex.classId === classId &&
            ex.canvasAssignmentId === a.id
        );
        if (exists) continue;
        if (!a.dueDate) continue;

        const assignment = await assignmentProvider.createAssignment({
          userId,
          classId,
          title: a.title,
          description: a.description,
          dueDate: a.dueDate,
          points: a.points,
          type: a.type ?? "homework",
          source: "canvas",
          canvasAssignmentId: a.id,
          completed: false,
        });
        created.push(assignment);
      }

      return created;
    } finally {
      await client.sessions.stop(session.id);
    }
  },

  async exportToCalendar(assignmentId, userId) {
    const assignment = assignmentsStore.get(assignmentId);
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
          title: `📋 DUE: ${assignment.title}`,
          date: assignment.dueDate,
          description: `${cls?.code ?? ""} assignment due today.\n${assignment.description ?? ""}`,
        },
        ...assignment.milestones.map((m) => ({
          title: `✅ ${m.title}`,
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
      assignmentsStore.set(assignmentId, updated);
      return true;
    } finally {
      await client.sessions.stop(session.id);
    }
  },
};
