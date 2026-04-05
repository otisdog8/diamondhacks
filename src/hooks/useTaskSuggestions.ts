"use client";

import { useMemo } from "react";
import type { ClassEvent } from "@/components/productivity/types";

export interface TimeSuggestion {
  id: string;
  start: Date;
  end: Date;
  /** Short headline: "Right now", "Before CSE 110", "After MATH 20C" */
  label: string;
  /** Time range or free-time callout: "25 min free", "1:30 – 2:00 PM" */
  sublabel: string;
  freeMinutes: number;
  isNow: boolean;
}

function fmt(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function findSuggestions(
  events: ClassEvent[],
  taskDurationMins: number,
  now: Date,
): TimeSuggestion[] {
  if (taskDurationMins <= 0) return [];

  // Only events that haven't fully ended
  const upcoming = [...events]
    .filter((e) => e.endTime > now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // End of productive day
  const eod = new Date(now);
  eod.setHours(22, 0, 0, 0);

  type Gap = {
    gapStart: Date;
    gapEnd: Date;
    beforeEvent?: ClassEvent;
    afterEvent?: ClassEvent;
  };

  const gaps: Gap[] = [];

  if (upcoming.length === 0) {
    if (eod > now) gaps.push({ gapStart: now, gapEnd: eod });
  } else {
    // Gap: now → first upcoming event start
    if (upcoming[0].startTime > now) {
      gaps.push({ gapStart: now, gapEnd: upcoming[0].startTime, beforeEvent: upcoming[0] });
    }

    // Gaps between consecutive events
    for (let i = 0; i < upcoming.length - 1; i++) {
      const a = upcoming[i];
      const b = upcoming[i + 1];
      const gapStart = a.endTime > now ? a.endTime : now;
      if (b.startTime > gapStart) {
        gaps.push({ gapStart, gapEnd: b.startTime, afterEvent: a, beforeEvent: b });
      }
    }

    // Gap: last event end → end of day
    const last = upcoming[upcoming.length - 1];
    if (last.endTime < eod) {
      const gapStart = last.endTime > now ? last.endTime : now;
      gaps.push({ gapStart, gapEnd: eod, afterEvent: last });
    }
  }

  const durationMs = taskDurationMins * 60_000;
  const suggestions: TimeSuggestion[] = [];

  for (const gap of gaps) {
    const freeMins = (gap.gapEnd.getTime() - gap.gapStart.getTime()) / 60_000;
    if (freeMins < taskDurationMins) continue;

    const start = gap.gapStart;
    const end = new Date(start.getTime() + durationMs);
    const isNow = start.getTime() - now.getTime() < 5 * 60_000;

    let label: string;
    let sublabel: string;

    if (isNow) {
      label = "Right now";
      sublabel = `${Math.round(freeMins)}m free`;
    } else if (gap.beforeEvent && !gap.afterEvent) {
      label = `Before ${gap.beforeEvent.code}`;
      sublabel = `${fmt(start)} – ${fmt(end)}`;
    } else if (gap.afterEvent && !gap.beforeEvent) {
      label = `After ${gap.afterEvent.code}`;
      sublabel = `${fmt(start)} – ${fmt(end)}`;
    } else if (gap.afterEvent && gap.beforeEvent) {
      label = `Between classes`;
      sublabel = `${fmt(start)} – ${fmt(end)}`;
    } else {
      label = fmt(start);
      sublabel = `${fmt(start)} – ${fmt(end)}`;
    }

    suggestions.push({
      id: `${start.getTime()}-${taskDurationMins}`,
      start,
      end,
      label,
      sublabel,
      freeMinutes: Math.round(freeMins),
      isNow,
    });

    if (suggestions.length >= 3) break;
  }

  return suggestions;
}

export function useTaskSuggestions(
  events: ClassEvent[],
  taskDurationMins: number | undefined,
  now: Date,
): TimeSuggestion[] {
  return useMemo(() => {
    if (!taskDurationMins || taskDurationMins <= 0 || taskDurationMins > 30) return [];
    return findSuggestions(events, taskDurationMins, now);
  }, [events, taskDurationMins, now]);
}
