// ============================================================
// ILectureProvider implementation
// Drop into src/lib/extensions/lecture-provider.ts
//
// Requires in .env.local:
//   TWELVELABS_API_KEY — from https://api.twelvelabs.io
//   ANTHROPIC_API_KEY  — for flashcard generation from transcript
// ============================================================
import { v4 as uuidv4 } from "uuid";
import type { ILecture, ILectureProvider, IFlashcard, ILectureSegment } from "./types";

const lecturesStore = new Map<string, ILecture>();

function now(): string {
  return new Date().toISOString();
}

const TWELVELABS_BASE = "https://api.twelvelabs.io/v1.3";

async function tlFetch(path: string, options?: RequestInit) {
  const apiKey = process.env.TWELVELABS_API_KEY;
  if (!apiKey) throw new Error("TWELVELABS_API_KEY not set");

  const res = await fetch(`${TWELVELABS_BASE}${path}`, {
    ...options,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TwelveLabs API error ${res.status}: ${body}`);
  }
  return res.json();
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
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

// Ensure a TwelveLabs index exists for CanvasCal (one-time setup per API key)
async function ensureIndex(): Promise<string> {
  // Check for existing index
  const existing = await tlFetch("/indexes?page=1&page_limit=10");
  const found = existing?.data?.find(
    (idx: { name: string; id: string }) => idx.name === "canvascal-lectures"
  );
  if (found) return found.id;

  // Create index
  const created = await tlFetch("/indexes", {
    method: "POST",
    body: JSON.stringify({
      name: "canvascal-lectures",
      engines: [
        { name: "marengo2.7", options: ["visual", "conversation", "text_in_video", "logo"] },
        { name: "pegasus1.2", options: ["visual", "conversation"] },
      ],
    }),
  });
  return created.id;
}

// Submit a video URL to TwelveLabs for indexing
async function submitVideo(indexId: string, videoUrl: string, title: string): Promise<string> {
  const task = await tlFetch("/tasks", {
    method: "POST",
    body: JSON.stringify({
      index_id: indexId,
      url: videoUrl,
      video_name: title,
    }),
  });
  return task.id; // task ID to poll
}

// Poll task until done
async function waitForTask(taskId: string, timeoutMs = 300_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const task = await tlFetch(`/tasks/${taskId}`);
    if (task.status === "ready") return task.video_id;
    if (task.status === "failed") throw new Error("TwelveLabs indexing failed");
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("TwelveLabs indexing timed out");
}

// Get transcript from TwelveLabs
async function getTranscript(videoId: string): Promise<{ text: string; segments: ILectureSegment[] }> {
  const result = await tlFetch(`/videos/${videoId}/transcription`);
  const words: Array<{ value: string; start: number; end: number }> = result?.words ?? [];

  // Group words into segments of ~30 seconds
  const segments: ILectureSegment[] = [];
  let current: { startSeconds: number; words: string[]; endSeconds: number } | null = null;

  for (const word of words) {
    if (!current || word.start - current.startSeconds > 30) {
      if (current) {
        segments.push({
          startSeconds: current.startSeconds,
          endSeconds: current.endSeconds,
          text: current.words.join(" "),
        });
      }
      current = { startSeconds: word.start, words: [word.value], endSeconds: word.end };
    } else {
      current.words.push(word.value);
      current.endSeconds = word.end;
    }
  }
  if (current) {
    segments.push({
      startSeconds: current.startSeconds,
      endSeconds: current.endSeconds,
      text: current.words.join(" "),
    });
  }

  const text = words.map((w) => w.value).join(" ");
  return { text, segments };
}

// Summarize + generate flashcards from transcript via Claude
async function generateStudyContent(
  transcript: string,
  lectureTitle: string
): Promise<{ summary: string; flashcards: IFlashcard[] }> {
  const summaryPrompt = `Here is the transcript of a lecture titled "${lectureTitle}":

${transcript.slice(0, 6000)}

Write a concise summary (3-5 paragraphs) of the key concepts covered in this lecture. Use Markdown.`;

  const flashcardPrompt = `Based on this lecture transcript titled "${lectureTitle}":

${transcript.slice(0, 4000)}

Generate 10 flashcards to help a student review this lecture. Return ONLY a JSON array with "front" and "back" fields. No other text.`;

  const [summary, flashcardText] = await Promise.all([
    callClaude(summaryPrompt),
    callClaude(flashcardPrompt),
  ]);

  let flashcards: IFlashcard[] = [];
  try {
    const match = flashcardText.match(/\[[\s\S]*\]/);
    if (match) flashcards = JSON.parse(match[0]);
  } catch {
    // ignore parse failure
  }

  return { summary, flashcards };
}

export const lectureProvider: ILectureProvider = {
  async getLecturesForClass(userId, classId) {
    return [...lecturesStore.values()].filter(
      (l) => l.userId === userId && l.classId === classId
    );
  },

  async addLecture(userId, classId, videoUrl, title) {
    const lecture: ILecture = {
      id: uuidv4(),
      userId,
      classId,
      title,
      videoUrl,
      status: "processing",
      createdAt: now(),
    };
    lecturesStore.set(lecture.id, lecture);
    return lecture;
  },

  async processLecture(lectureId) {
    const lecture = lecturesStore.get(lectureId);
    if (!lecture) throw new Error("Lecture not found");

    try {
      // Step 1: Ensure index exists
      const indexId = await ensureIndex();

      // Step 2: Submit video to TwelveLabs
      const taskId = await submitVideo(indexId, lecture.videoUrl, lecture.title);

      // Step 3: Wait for indexing (this can take a few minutes)
      const videoId = await waitForTask(taskId);

      // Step 4: Get transcript
      const { text: transcript, segments } = await getTranscript(videoId);

      // Step 5: Generate summary + flashcards via Claude
      const { summary, flashcards } = await generateStudyContent(transcript, lecture.title);

      const updated: ILecture = {
        ...lecture,
        transcript,
        summary,
        flashcards,
        segments,
        status: "ready",
        processedAt: now(),
      };
      lecturesStore.set(lectureId, updated);
      return updated;
    } catch (err) {
      const failed: ILecture = { ...lecture, status: "failed", processedAt: now() };
      lecturesStore.set(lectureId, failed);
      throw err;
    }
  },

  async deleteLecture(id) {
    return lecturesStore.delete(id);
  },
};
