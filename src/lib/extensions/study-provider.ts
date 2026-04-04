// ============================================================
// IStudyMaterialProvider implementation
// Drop into src/lib/extensions/study-provider.ts
//
// Uses Claude (claude-sonnet-4-6) to generate flashcards + summaries
// from the class description, syllabus URL, and scraped course data.
// ============================================================
import { v4 as uuidv4 } from "uuid";
import { repo } from "@/lib/db";
import type { IStudyMaterial, IStudyMaterialProvider, IFlashcard } from "./types";

const materialsStore = new Map<string, IStudyMaterial>();

function now(): string {
  return new Date().toISOString();
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
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude API error: ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function fetchSyllabusText(syllabusUrl: string): Promise<string> {
  try {
    const res = await fetch(syllabusUrl, { signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    // Strip HTML tags roughly
    return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
  } catch {
    return "";
  }
}

export const studyProvider: IStudyMaterialProvider = {
  async getMaterialsForClass(userId, classId) {
    return [...materialsStore.values()].filter(
      (m) => m.userId === userId && m.classId === classId
    );
  },

  async generateFlashcards(userId, classId) {
    const cls = await repo.findClassById(classId);
    if (!cls) throw new Error("Class not found");

    let context = `Course: ${cls.name} (${cls.code})\nInstructor: ${cls.instructor ?? "Unknown"}\nTerm: ${cls.term ?? "Current"}`;
    if (cls.description) context += `\n\nDescription:\n${cls.description}`;
    if (cls.syllabusUrl) {
      const syllabus = await fetchSyllabusText(cls.syllabusUrl);
      if (syllabus) context += `\n\nSyllabus content:\n${syllabus}`;
    }

    const prompt = `You are a study assistant. Based on the following course information, generate 15 high-quality flashcards to help a student learn the key concepts of this course.

${context}

Return ONLY a JSON array of objects, each with "front" (the question or term) and "back" (the answer or definition). No other text, no markdown code blocks.

Example format:
[{"front": "What is X?", "back": "X is ..."},{"front": "Define Y", "back": "Y refers to ..."}]`;

    const response = await callClaude(prompt);

    let flashcards: IFlashcard[] = [];
    try {
      const match = response.match(/\[[\s\S]*\]/);
      if (match) flashcards = JSON.parse(match[0]);
    } catch {
      throw new Error("Failed to parse flashcards from AI response");
    }

    const material: IStudyMaterial = {
      id: uuidv4(),
      userId,
      classId,
      type: "flashcards",
      title: `${cls.code} Flashcards`,
      content: JSON.stringify(flashcards),
      flashcards,
      generatedAt: now(),
    };

    materialsStore.set(material.id, material);
    return material;
  },

  async generateSummary(userId, classId) {
    const cls = await repo.findClassById(classId);
    if (!cls) throw new Error("Class not found");

    let context = `Course: ${cls.name} (${cls.code})\nInstructor: ${cls.instructor ?? "Unknown"}\nTerm: ${cls.term ?? "Current"}`;
    if (cls.description) context += `\n\nDescription:\n${cls.description}`;
    if (cls.syllabusUrl) {
      const syllabus = await fetchSyllabusText(cls.syllabusUrl);
      if (syllabus) context += `\n\nSyllabus content:\n${syllabus}`;
    }

    const prompt = `You are a study assistant. Based on the following course information, write a concise but comprehensive course overview to help a student understand what this class is about and what they will learn.

${context}

Write the overview in Markdown format. Include:
1. A 2-3 sentence summary of the course
2. Key topics covered (as a bullet list)
3. What skills the student will gain
4. Study tips specific to this type of course

Keep the total response under 500 words.`;

    const summary = await callClaude(prompt);

    const material: IStudyMaterial = {
      id: uuidv4(),
      userId,
      classId,
      type: "summary",
      title: `${cls.code} Course Overview`,
      content: summary,
      generatedAt: now(),
    };

    materialsStore.set(material.id, material);
    return material;
  },

  async deleteMaterial(id) {
    return materialsStore.delete(id);
  },
};
