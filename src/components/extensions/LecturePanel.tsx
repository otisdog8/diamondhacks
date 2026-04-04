"use client";
// ============================================================
// LecturePanel component
// Drop into src/components/extensions/LecturePanel.tsx
// ============================================================
import { useState, useEffect, useCallback, useRef } from "react";
import type { ILecture, IFlashcard } from "@/lib/extensions/types";

interface Props {
  classId: string;
  className: string;
}

export function LecturePanel({ classId, className }: Props) {
  const [lectures, setLectures] = useState<ILecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ILecture | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadLectures = useCallback(async () => {
    const res = await fetch(`/api/lectures?classId=${classId}`);
    const data = await res.json();
    const updated: ILecture[] = data.lectures ?? [];
    setLectures(updated);
    setLoading(false);

    // Update selected if it changed
    if (selected) {
      const refreshed = updated.find((l) => l.id === selected.id);
      if (refreshed) setSelected(refreshed);
    }

    return updated;
  }, [classId, selected]);

  useEffect(() => { loadLectures(); }, [loadLectures]);

  // Poll for processing lectures every 10 seconds
  useEffect(() => {
    const hasProcessing = lectures.some((l) => l.status === "processing");
    if (hasProcessing && !pollRef.current) {
      pollRef.current = setInterval(() => loadLectures(), 10_000);
    } else if (!hasProcessing && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [lectures, loadLectures]);

  async function addLecture() {
    if (!videoUrl.trim() || !title.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/lectures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, videoUrl, title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVideoUrl("");
      setTitle("");
      await loadLectures();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add lecture");
    } finally {
      setAdding(false);
    }
  }

  async function deleteLecture(id: string) {
    await fetch(`/api/lectures/${id}`, { method: "DELETE" });
    setLectures((prev) => prev.filter((l) => l.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Lectures — {className}
      </h3>

      {/* Add lecture form */}
      <div className="space-y-2 mb-5">
        <input
          type="text"
          placeholder="Lecture title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="Video URL (YouTube, Kaltura, Panopto…)"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            onClick={addLecture}
            disabled={adding || !videoUrl.trim() || !title.trim()}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          TwelveLabs will index the video and Claude will generate a transcript, summary, and flashcards.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
      ) : lectures.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No lectures yet. Add a video URL above.
        </p>
      ) : (
        <div className="flex gap-4">
          {/* Lecture list */}
          <div className="w-48 shrink-0 space-y-1">
            {lectures.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelected(l)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors group ${
                  selected?.id === l.id
                    ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="font-medium truncate">{l.title}</p>
                  <span
                    className={`shrink-0 w-2 h-2 rounded-full ${
                      l.status === "ready"
                        ? "bg-green-400"
                        : l.status === "failed"
                        ? "bg-red-400"
                        : "bg-amber-400 animate-pulse"
                    }`}
                  />
                </div>
                <p className="text-gray-400 capitalize">{l.status}</p>
              </button>
            ))}
          </div>

          {/* Detail */}
          <div className="flex-1 min-w-0">
            {selected ? (
              <LectureDetail lecture={selected} onDelete={deleteLecture} />
            ) : (
              <p className="text-sm text-gray-400 pt-4">Select a lecture to view it.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LectureDetail({
  lecture,
  onDelete,
}: {
  lecture: ILecture;
  onDelete: (id: string) => void;
}) {
  const [tab, setTab] = useState<"summary" | "flashcards" | "transcript">("summary");
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (lecture.status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-purple-400 border-t-transparent animate-spin mb-3" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Processing lecture…</p>
        <p className="text-xs text-gray-400 mt-1">
          TwelveLabs is indexing the video. This may take a few minutes.
        </p>
      </div>
    );
  }

  if (lecture.status === "failed") {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-500 mb-2">Processing failed</p>
        <button
          onClick={() => onDelete(lecture.id)}
          className="text-xs text-gray-400 hover:text-red-400"
        >
          Remove
        </button>
      </div>
    );
  }

  const cards: IFlashcard[] = lecture.flashcards ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {(["summary", "flashcards", "transcript"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs rounded-lg capitalize transition-colors ${
                tab === t
                  ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => onDelete(lecture.id)}
          className="text-xs text-gray-400 hover:text-red-400"
        >
          Delete
        </button>
      </div>

      {tab === "summary" && (
        <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
          {lecture.summary ?? "No summary available."}
        </div>
      )}

      {tab === "flashcards" && (
        cards.length === 0 ? (
          <p className="text-sm text-gray-400">No flashcards generated.</p>
        ) : (
          <div>
            <p className="text-xs text-gray-400 mb-2">{cardIndex + 1} / {cards.length}</p>
            <div
              onClick={() => setFlipped((f) => !f)}
              className="min-h-28 rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4 cursor-pointer flex items-center justify-center text-center select-none"
            >
              <p className="text-sm text-gray-800 dark:text-gray-200">
                {flipped ? cards[cardIndex].back : cards[cardIndex].front}
              </p>
            </div>
            <p className="text-xs text-gray-400 text-center mt-1">
              {flipped ? "Answer" : "Question"} — click to flip
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => { setCardIndex((i) => Math.max(0, i - 1)); setFlipped(false); }}
                disabled={cardIndex === 0}
                className="flex-1 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                ← Prev
              </button>
              <button
                onClick={() => { setCardIndex((i) => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}
                disabled={cardIndex === cards.length - 1}
                className="flex-1 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Next →
              </button>
            </div>
          </div>
        )
      )}

      {tab === "transcript" && (
        <div className="max-h-64 overflow-y-auto text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          {lecture.transcript ?? "No transcript available."}
        </div>
      )}
    </div>
  );
}
