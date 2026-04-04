"use client";
// ============================================================
// StudyPanel component
// Drop into src/components/extensions/StudyPanel.tsx
// ============================================================
import { useState, useEffect, useCallback } from "react";
import type { IStudyMaterial, IFlashcard } from "@/lib/extensions/types";

interface Props {
  classId: string;
  className: string;
}

export function StudyPanel({ classId, className }: Props) {
  const [materials, setMaterials] = useState<IStudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<"flashcards" | "summary" | null>(null);
  const [selected, setSelected] = useState<IStudyMaterial | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/study/${classId}`);
    const data = await res.json();
    setMaterials(data.materials ?? []);
    setLoading(false);
  }, [classId]);

  useEffect(() => { loadMaterials(); }, [loadMaterials]);

  async function generate(type: "flashcards" | "summary") {
    setGenerating(type);
    setError(null);
    try {
      const res = await fetch(`/api/study/${classId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMaterials((prev) => [...prev, data.material]);
      setSelected(data.material);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(null);
    }
  }

  async function deleteMaterial(id: string) {
    await fetch(`/api/study/${classId}`, { method: "DELETE", body: JSON.stringify({ id }) });
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Study materials — {className}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => generate("summary")}
            disabled={!!generating}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 disabled:opacity-50 transition-colors"
          >
            {generating === "summary" ? "Generating…" : "+ Summary"}
          </button>
          <button
            onClick={() => generate("flashcards")}
            disabled={!!generating}
            className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 disabled:opacity-50 transition-colors"
          >
            {generating === "flashcards" ? "Generating…" : "+ Flashcards"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
      ) : (
        <div className="flex gap-4">
          {/* Sidebar: material list */}
          <div className="w-44 shrink-0 space-y-1">
            {materials.length === 0 ? (
              <p className="text-xs text-gray-400 text-center pt-4">
                No materials yet — generate one above.
              </p>
            ) : (
              materials.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    selected?.id === m.id
                      ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <p className="font-medium truncate">{m.title}</p>
                  <p className="text-gray-400 capitalize">{m.type}</p>
                </button>
              ))
            )}
          </div>

          {/* Content panel */}
          <div className="flex-1 min-w-0">
            {selected ? (
              selected.type === "flashcards" ? (
                <FlashcardViewer material={selected} onDelete={deleteMaterial} />
              ) : (
                <SummaryViewer material={selected} onDelete={deleteMaterial} />
              )
            ) : (
              <p className="text-sm text-gray-400 pt-4">
                Select a material to view it.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FlashcardViewer({
  material,
  onDelete,
}: {
  material: IStudyMaterial;
  onDelete: (id: string) => void;
}) {
  const cards: IFlashcard[] = material.flashcards ?? JSON.parse(material.content);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = cards[index];
  const total = cards.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">
          {index + 1} / {total}
        </p>
        <button
          onClick={() => onDelete(material.id)}
          className="text-xs text-gray-400 hover:text-red-400"
        >
          Delete
        </button>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped((f) => !f)}
        className="min-h-32 rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-5 cursor-pointer flex items-center justify-center text-center select-none transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/30"
      >
        <p className="text-sm text-gray-800 dark:text-gray-200">
          {flipped ? card.back : card.front}
        </p>
      </div>
      <p className="text-xs text-gray-400 text-center mt-1">
        {flipped ? "Answer" : "Question"} — click to flip
      </p>

      {/* Nav */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => { setIndex((i) => Math.max(0, i - 1)); setFlipped(false); }}
          disabled={index === 0}
          className="flex-1 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          ← Prev
        </button>
        <button
          onClick={() => { setIndex((i) => Math.min(total - 1, i + 1)); setFlipped(false); }}
          disabled={index === total - 1}
          className="flex-1 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function SummaryViewer({
  material,
  onDelete,
}: {
  material: IStudyMaterial;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{material.title}</p>
        <button
          onClick={() => onDelete(material.id)}
          className="text-xs text-gray-400 hover:text-red-400"
        >
          Delete
        </button>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
        {material.content}
      </div>
    </div>
  );
}
