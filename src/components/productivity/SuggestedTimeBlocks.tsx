"use client";

import type { TimeSuggestion } from "@/hooks/useTaskSuggestions";

interface Props {
  suggestions: TimeSuggestion[];
  selectedId?: string;
  onSelect: (suggestion: TimeSuggestion) => void;
}

export function SuggestedTimeBlocks({ suggestions, selectedId, onSelect }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-1.5 ml-[26px] flex flex-wrap gap-1.5 animate-fade-up">
      <span className="w-full text-[10px] text-gray-400 mb-0.5">Good windows</span>
      {suggestions.map((s, i) => {
        const isSelected = s.id === selectedId;
        const isBest = i === 0;

        return (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={[
              "flex flex-col items-start px-2.5 py-1.5 rounded-xl text-left transition-all duration-150",
              isSelected
                ? "bg-sky-100 border border-sky-300 shadow-[0_0_0_3px_rgba(125,211,252,0.18)]"
                : isBest
                ? "bg-sky-50/80 border border-sky-200 hover:bg-sky-100 hover:border-sky-300"
                : "bg-white/70 border border-gray-200 hover:bg-sky-50 hover:border-sky-200",
            ].join(" ")}
          >
            <span
              className={`text-[11px] font-semibold leading-tight ${
                isSelected ? "text-sky-700" : "text-sky-600"
              }`}
            >
              {s.isNow && !isSelected ? "⚡ " : ""}
              {s.label}
            </span>
            <span
              className={`text-[10px] leading-tight mt-0.5 ${
                isSelected ? "text-sky-500" : "text-sky-400"
              }`}
            >
              {s.sublabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
