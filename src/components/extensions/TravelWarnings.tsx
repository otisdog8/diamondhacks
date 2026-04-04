"use client";
// ============================================================
// TravelWarnings component
// Drop into src/components/extensions/TravelWarnings.tsx
// ============================================================
import { useState, useEffect } from "react";
import type { ITravelSegment } from "@/lib/extensions/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ClassMap {
  [classId: string]: { name: string; code: string };
}

interface Props {
  classes: ClassMap;
}

export function TravelWarnings({ classes }: Props) {
  const [segments, setSegments] = useState<ITravelSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    fetch("/api/travel")
      .then((r) => r.json())
      .then((d) => setSegments(d.segments ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function recompute() {
    setComputing(true);
    try {
      const res = await fetch("/api/travel", { method: "POST" });
      const data = await res.json();
      setSegments(data.segments ?? []);
    } finally {
      setComputing(false);
    }
  }

  const warnings = segments.filter((s) => s.bufferWarning);
  const ok = segments.filter((s) => !s.bufferWarning);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Travel times</h3>
        <button
          onClick={recompute}
          disabled={computing}
          className="text-xs px-3 py-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-800/60 disabled:opacity-50 transition-colors"
        >
          {computing ? "Computing…" : "Recompute"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
      ) : segments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No back-to-back classes found. Enable classes with locations to see travel times.
        </p>
      ) : (
        <div className="space-y-2">
          {warnings.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">
                ⚠ Tight transitions
              </p>
              {warnings.map((s) => (
                <SegmentRow key={s.id} segment={s} classes={classes} warning />
              ))}
            </div>
          )}
          {ok.map((s) => (
            <SegmentRow key={s.id} segment={s} classes={classes} warning={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function SegmentRow({
  segment,
  classes,
  warning,
}: {
  segment: ITravelSegment;
  classes: ClassMap;
  warning: boolean;
}) {
  const from = classes[segment.fromClassId];
  const to = classes[segment.toClassId];

  return (
    <div
      className={`rounded-lg px-3 py-2.5 text-sm flex items-center gap-3 ${
        warning
          ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
          : "bg-gray-50 dark:bg-gray-800"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-gray-800 dark:text-gray-200 font-medium truncate">
          {from?.code ?? segment.fromClassId} → {to?.code ?? segment.toClassId}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {segment.fromLocation} → {segment.toLocation}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p
          className={`font-semibold text-sm ${
            warning
              ? "text-amber-600 dark:text-amber-400"
              : "text-teal-600 dark:text-teal-400"
          }`}
        >
          {segment.walkingMinutes} min walk
        </p>
        <p className="text-xs text-gray-400">
          {segment.gapMinutes} min gap
        </p>
      </div>
    </div>
  );
}
