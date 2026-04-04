"use client";

import { useState, useEffect } from "react";
import type { ClassEvent } from "./types";

interface TimelineItem {
  kind: "class" | "gap" | "now";
  event?: ClassEvent;
  durationMins?: number;
  label?: string;
}

function buildTimeline(events: ClassEvent[], now: Date): TimelineItem[] {
  if (events.length === 0) return [];

  const items: TimelineItem[] = [];
  const sorted = [...events].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  let nowInserted = false;

  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i];
    const prev = sorted[i - 1];

    // Gap before this event
    const gapStart = prev ? prev.endTime : null;
    if (gapStart) {
      const gapMins =
        (event.startTime.getTime() - gapStart.getTime()) / 60_000;
      if (gapMins >= 5) {
        // Insert "now" marker into gap if applicable
        if (!nowInserted && now > gapStart && now < event.startTime) {
          items.push({ kind: "now" });
          nowInserted = true;
        }
        items.push({
          kind: "gap",
          durationMins: gapMins,
        });
      }
    }

    // Insert "now" marker before this class if applicable
    if (!nowInserted && now < event.startTime) {
      items.push({ kind: "now" });
      nowInserted = true;
    }

    const isPast = event.endTime <= now;
    const isCurrent = event.startTime <= now && now < event.endTime;
    items.push({
      kind: "class",
      event,
      label: isCurrent ? "now" : isPast ? "past" : undefined,
    });
  }

  // "now" after all classes
  if (!nowInserted) {
    items.push({ kind: "now" });
  }

  return items;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

interface DailyTimelineProps {
  events: ClassEvent[];
  nextDay?: { dayName: string; events: ClassEvent[] } | null;
}

export function DailyTimeline({ events, nextDay }: DailyTimelineProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // No classes today — show next class day preview if available
  if (events.length === 0) {
    if (nextDay) {
      return (
        <div className="bg-white rounded-2xl border border-sky-100/60 shadow-sm p-5">
          <p className="text-xs font-semibold text-sky-400 uppercase tracking-widest mb-3">
            Coming up · {nextDay.dayName}
          </p>
          <div className="space-y-2">
            {nextDay.events.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 rounded-xl bg-slate-50 border border-sky-100/60 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-semibold text-sky-700">{event.code}</span>
                  <p className="text-xs text-sky-400 truncate mt-0.5">{event.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-sky-400">
                    {event.startTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-sky-300">
                    {event.endTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                {event.location && (
                  <p className="text-xs text-sky-300">{event.location}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-sky-100/60 shadow-sm p-5">
        <p className="text-xs font-semibold text-sky-400 uppercase tracking-widest mb-3">
          Today
        </p>
        <div className="py-8 text-center">
          <p className="text-sm text-sky-300">No classes scheduled today</p>
        </div>
      </div>
    );
  }

  const items = buildTimeline(events, now);

  return (
    <div className="bg-white rounded-2xl border border-sky-100/60 shadow-sm p-5">
      <p className="text-xs font-semibold text-sky-400 uppercase tracking-widest mb-4">
        Today
      </p>

      <div className="relative pl-5">
        {/* Vertical rail */}
        <div className="absolute left-1.5 top-0 bottom-0 w-px bg-slate-100" />

        <div className="space-y-1">
          {items.map((item, idx) => {
            if (item.kind === "now") {
              return (
                <div key={`now-${idx}`} className="relative flex items-center gap-3 py-1">
                  <div className="absolute -left-[17px] w-2.5 h-2.5 rounded-full bg-teal-400 ring-2 ring-teal-100" />
                  <span className="text-xs font-semibold text-sky-400 uppercase tracking-widest">
                    Now
                  </span>
                </div>
              );
            }

            if (item.kind === "gap") {
              const mins = Math.round(item.durationMins ?? 0);
              return (
                <div
                  key={`gap-${idx}`}
                  className="relative flex items-center gap-3 py-2 pl-2"
                >
                  <div className="absolute -left-[15px] w-2 h-px bg-slate-200" />
                  <div className="flex-1 flex items-center justify-between bg-teal-50 rounded-xl px-3 py-2">
                    <span className="text-sm text-sky-500 font-medium">
                      {mins} min free
                    </span>
                    <span className="text-xs text-sky-300">
                      {mins >= 30
                        ? "focus session"
                        : mins >= 15
                        ? "quick review"
                        : "short break"}
                    </span>
                  </div>
                </div>
              );
            }

            if (item.kind === "class" && item.event) {
              const { event, label } = item;
              const isPast = label === "past";
              const isCurrent = label === "now";

              return (
                <div
                  key={event.id}
                  className={`relative flex gap-3 py-1 pl-2 ${isPast ? "opacity-40" : ""}`}
                >
                  <div
                    className={`absolute -left-[15px] w-2 h-2 rounded-full mt-2 shrink-0 ${
                      isCurrent ? "bg-teal-400" : isPast ? "bg-slate-200" : "bg-slate-300"
                    }`}
                  />
                  <div
                    className={`flex-1 rounded-xl px-3 py-2.5 ${
                      isCurrent
                        ? "bg-teal-50 border border-sky-100"
                        : "bg-slate-50 border border-sky-100/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-semibold ${
                              isCurrent ? "text-sky-600" : "text-sky-700"
                            }`}
                          >
                            {event.code}
                          </span>
                          {isCurrent && (
                            <span className="text-xs font-medium text-sky-400 bg-teal-100 px-1.5 py-0.5 rounded-full">
                              Now
                            </span>
                          )}
                          {!isPast && !isCurrent && idx === items.findIndex(i => i.kind === "class" && (i as typeof item).label !== "past") && (
                            <span className="text-xs font-medium text-sky-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                              Next up
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-sky-400 truncate mt-0.5">
                          {event.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-sky-400">
                          {formatTime(event.startTime)}
                        </p>
                        <p className="text-xs text-sky-300">
                          {formatTime(event.endTime)}
                        </p>
                      </div>
                    </div>
                    {event.location && (
                      <p className="text-xs text-sky-400 mt-1">
                        {event.location}
                      </p>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}
