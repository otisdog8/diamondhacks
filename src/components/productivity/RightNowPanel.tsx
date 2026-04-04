"use client";

import { useState, useEffect } from "react";
import type { ClassEvent } from "./types";

const QUICK_TASKS = [
  "Review your notes from last class",
  "Check Canvas for new announcements",
  "Respond to pending messages",
  "Skim the reading for next class",
  "Grab water or a snack",
  "Do a quick stretch",
  "Organize your notes",
  "Write down any questions for next class",
];

function getQuickTasks(availableMinutes: number): string[] {
  const seed = new Date().getHours();
  const shuffled = [...QUICK_TASKS].sort(
    (a, b) => ((a.charCodeAt(0) + seed) % 7) - ((b.charCodeAt(0) + seed) % 7)
  );
  return shuffled.slice(0, availableMinutes < 15 ? 2 : 3);
}

interface RightNowPanelProps {
  events: ClassEvent[];
  hasClasses?: boolean;
  nextDay?: { dayName: string; events: ClassEvent[] } | null;
}

export function RightNowPanel({ events, hasClasses, nextDay }: RightNowPanelProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const currentClass = events.find((e) => e.startTime <= now && now < e.endTime);
  const nextClass    = events.find((e) => e.startTime > now);
  const allDone      = events.length > 0 && events.every((e) => e.endTime <= now);
  const minsUntilNext = nextClass
    ? (nextClass.startTime.getTime() - now.getTime()) / 60_000
    : null;

  if (allDone) {
    return (
      <div className="glass rounded-2xl p-5">
        <p className="text-xs font-semibold text-sky-400 uppercase tracking-widest mb-1">Right now</p>
        <p className="text-xl font-light text-sky-800">All done for today</p>
        <p className="text-sm text-sky-300 mt-1">No more classes. Good work.</p>
      </div>
    );
  }

  if (currentClass) {
    const minsLeft = Math.ceil((currentClass.endTime.getTime() - now.getTime()) / 60_000);
    return (
      <div className="rounded-2xl p-5 border border-sky-200/50"
           style={{ background: "linear-gradient(135deg, rgba(224,242,254,0.7) 0%, rgba(255,255,255,0.7) 100%)", backdropFilter: "blur(12px)" }}>
        <p className="text-xs font-semibold text-sky-400 uppercase tracking-widest mb-1">Happening now</p>
        <p className="text-xl font-semibold text-sky-700">{currentClass.code}</p>
        <p className="text-sm text-sky-500 mt-0.5">{currentClass.name}</p>
        <p className="text-sm text-sky-400 mt-2">
          Ends in {minsLeft} min{minsLeft !== 1 ? "s" : ""}
          {currentClass.location ? ` · ${currentClass.location}` : ""}
        </p>
      </div>
    );
  }

  // No classes today, but classes exist — show next class day preview
  if (!nextClass && hasClasses && nextDay) {
    const first = nextDay.events[0];
    const startLabel = first.startTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return (
      <div className="glass rounded-2xl p-5">
        <p className="text-xs font-semibold text-sky-400 uppercase tracking-widest mb-1">Right now</p>
        <p className="text-xl font-light text-sky-800">No classes today</p>
        <p className="text-sm text-sky-400 mt-2">
          Next up: <span className="font-semibold text-sky-500">{first.code}</span> {nextDay.dayName.toLowerCase() === "tomorrow" ? "tomorrow" : `on ${nextDay.dayName}`} at {startLabel}
          {first.location ? ` · ${first.location}` : ""}
        </p>
        {nextDay.events.length > 1 && (
          <p className="text-xs text-sky-300 mt-1">
            + {nextDay.events.length - 1} more class{nextDay.events.length - 1 !== 1 ? "es" : ""} {nextDay.dayName.toLowerCase() === "today" ? "today" : nextDay.dayName.toLowerCase()}
          </p>
        )}
      </div>
    );
  }

  if (!nextClass || minsUntilNext === null) {
    return (
      <div className="glass rounded-2xl p-5">
        <p className="text-xs font-semibold text-sky-400 uppercase tracking-widest mb-1">Right now</p>
        <p className="text-xl font-light text-sky-800">No classes today</p>
        <p className="text-sm text-sky-300 mt-1">Enjoy your free day.</p>
      </div>
    );
  }

  const hasTime = minsUntilNext >= 30;
  const suggestions = getQuickTasks(minsUntilNext);

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs font-semibold text-sky-400 uppercase tracking-widest mb-2">Right now</p>
      <p className="text-xl font-light text-sky-800">
        {Math.floor(minsUntilNext)} min until{" "}
        <span className="font-semibold text-sky-500">{nextClass.code}</span>
      </p>
      {nextClass.location && (
        <p className="text-sm text-sky-300 mt-0.5">{nextClass.location}</p>
      )}

      <div className="mt-4">
        {hasTime ? (
          <div className="flex items-start gap-3 bg-sky-50/60 rounded-xl px-4 py-3 border border-sky-100/60">
            <span className="text-sky-400 mt-0.5">◎</span>
            <div>
              <p className="text-sm font-medium text-sky-700">You have time for a focus session</p>
              <p className="text-xs text-sky-400 mt-0.5">Start a 20-minute timer to make use of this break.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-sky-300 mb-2">Quick things you could do:</p>
            {suggestions.map((task) => (
              <div key={task} className="flex items-center gap-2.5 text-sm text-sky-600">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-300 shrink-0" />
                {task}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
