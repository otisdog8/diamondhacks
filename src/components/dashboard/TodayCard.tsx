"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { useClasses } from "@/hooks/useClasses";
import type { ClassInfo } from "@/hooks/useClasses";

// ── helpers ───────────────────────────────────────────────────────────────────

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatTimeLabel(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const TRAVEL_BUFFER_MINS = 10;

function getSuggestedTasks(freeMinutes: number): string[] {
  if (freeMinutes < 20) return ["Check Canvas", "Review notes"];
  if (freeMinutes < 45) return ["Start on readings", "Review lecture notes", "Check assignments"];
  if (freeMinutes < 90) return ["Practice problems", "Work on an assignment", "Read ahead"];
  return ["Deep study session", "Finish an assignment", "Get ahead on readings"];
}

interface NextClassEntry {
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  location?: string;
  minutesUntil: number;
}

function findNextClass(
  classes: ClassInfo[],
  nowMinutes: number,
  todayDow: number
): NextClassEntry | null {
  const candidates: NextClassEntry[] = [];
  for (const cls of classes) {
    if (!cls.enabled) continue;
    for (const s of cls.schedule) {
      if (s.dayOfWeek !== todayDow) continue;
      const start = parseTimeToMinutes(s.startTime);
      if (start <= nowMinutes) continue;
      candidates.push({
        name: cls.name,
        code: cls.code,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        minutesUntil: start - nowMinutes,
      });
    }
  }
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => a.minutesUntil - b.minutesUntil)[0];
}

// ── component ─────────────────────────────────────────────────────────────────

export function TodayCard() {
  const { classes, loading } = useClasses();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { nextClass, suggestedTasks } = useMemo(() => {
    const todayDow = now.getDay();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const next = findNextClass(classes, nowMinutes, todayDow);
    return {
      nextClass: next,
      suggestedTasks: getSuggestedTasks(next?.minutesUntil ?? 120),
    };
  }, [classes, now]);

  const leaveInMins = nextClass != null ? nextClass.minutesUntil - TRAVEL_BUFFER_MINS : null;
  const showLeaveReminder = leaveInMins != null && leaveInMins > 0 && leaveInMins <= 50;
  const isUrgent = leaveInMins != null && leaveInMins <= 15;

  const dayLabel = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Card className="p-8 space-y-7">

      {/* ── Clock ── */}
      <div>
        <p className="text-xs text-gray-400 tracking-wide">{dayLabel}</p>
        <p className="mt-1 text-5xl font-light tabular-nums leading-none text-gray-900 dark:text-white">
          {formatClock(now)}
        </p>
      </div>

      {/* ── Next class ── */}
      <div className="space-y-3">
        {loading ? (
          <div className="h-12 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-700/60" />
        ) : nextClass ? (
          <>
            {/* Left-accent row */}
            <div className="flex gap-4 items-start">
              <div className="mt-1 w-0.5 self-stretch rounded-full bg-indigo-200 dark:bg-indigo-700 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {nextClass.name}
                  </p>
                  <p className="shrink-0 text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                    {formatTimeLabel(nextClass.startTime)}
                  </p>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-3">
                  <p className="text-xs text-gray-400 truncate">
                    {nextClass.code}
                    {nextClass.location ? ` · ${nextClass.location}` : ""}
                  </p>
                  <p className="shrink-0 text-xs font-medium text-indigo-400 dark:text-indigo-400 tabular-nums">
                    in {formatDuration(nextClass.minutesUntil)}
                  </p>
                </div>
              </div>
            </div>

            {/* Leave reminder — sits just under the class row, inline */}
            {showLeaveReminder && (
              <div
                className={`flex items-center gap-2 text-xs font-medium pl-4 ${
                  isUrgent
                    ? "text-red-500 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 animate-pulse ${
                    isUrgent ? "bg-red-400" : "bg-amber-400"
                  }`}
                />
                Leave in {leaveInMins} min
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No more classes today
          </p>
        )}
      </div>

      {/* ── Suggested tasks ── */}
      {!loading && nextClass != null && nextClass.minutesUntil >= 15 && (
        <div className="space-y-2.5">
          <p className="text-xs text-gray-400">
            {formatDuration(nextClass.minutesUntil)} free
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedTasks.map((task) => (
              <span
                key={task}
                className="rounded-xl bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700"
              >
                {task}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
