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
      <div className="bg-white dark:bg-[#1A1D27] border border-[#EBEBEB] dark:border-[#1E2235] rounded-xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-[#8F8F8F] uppercase tracking-widest mb-1">Right now</p>
        <p className="text-xl font-light text-[#000000] dark:text-[#F5F6F8]">All done for today</p>
        <p className="text-sm text-[#8F8F8F] mt-1">No more classes. Good work.</p>
      </div>
    );
  }

  if (currentClass) {
    const minsLeft = Math.ceil((currentClass.endTime.getTime() - now.getTime()) / 60_000);
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
        <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-1">Happening now</p>
        <p className="text-xl font-semibold text-[#000000] dark:text-[#F5F6F8]">
          {currentClass.code}
          {currentClass.type === "office_hours" ? " OH" : ""}
        </p>
        <p className="text-sm text-[#464646] dark:text-[#C8C8C8] mt-0.5">
          {currentClass.type === "office_hours" && currentClass.host
            ? currentClass.host
            : currentClass.name}
        </p>
        <p className="text-sm text-[#8F8F8F] mt-2">
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
      <div className="bg-white dark:bg-[#1A1D27] border border-[#EBEBEB] dark:border-[#1E2235] rounded-xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-[#8F8F8F] uppercase tracking-widest mb-1">Right now</p>
        <p className="text-xl font-light text-[#000000] dark:text-[#F5F6F8]">No classes today</p>
        <p className="text-sm text-[#464646] dark:text-[#C8C8C8] mt-2">
          Next up:{" "}
          <span className="font-semibold text-blue-500">{first.code}</span>{" "}
          {nextDay.dayName.toLowerCase() === "tomorrow" ? "tomorrow" : `on ${nextDay.dayName}`} at {startLabel}
          {first.location ? ` · ${first.location}` : ""}
        </p>
        {nextDay.events.length > 1 && (
          <p className="text-xs text-[#8F8F8F] mt-1">
            + {nextDay.events.length - 1} more class{nextDay.events.length - 1 !== 1 ? "es" : ""}{" "}
            {nextDay.dayName.toLowerCase() === "today" ? "today" : nextDay.dayName.toLowerCase()}
          </p>
        )}
      </div>
    );
  }

  if (!nextClass || minsUntilNext === null) {
    return (
      <div className="bg-white dark:bg-[#1A1D27] border border-[#EBEBEB] dark:border-[#1E2235] rounded-xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-[#8F8F8F] uppercase tracking-widest mb-1">Right now</p>
        <p className="text-xl font-light text-[#000000] dark:text-[#F5F6F8]">No classes today</p>
        <p className="text-sm text-[#8F8F8F] mt-1">Enjoy your free day.</p>
      </div>
    );
  }

  const hasTime = minsUntilNext >= 30;
  const suggestions = getQuickTasks(minsUntilNext);

  return (
    <div className="bg-white dark:bg-[#1A1D27] border border-[#EBEBEB] dark:border-[#1E2235] rounded-xl p-5 shadow-sm">
      <p className="text-xs font-semibold text-[#8F8F8F] uppercase tracking-widest mb-2">Right now</p>
      <p className="text-xl font-light text-[#000000] dark:text-[#F5F6F8]">
        {Math.floor(minsUntilNext)} min until{" "}
        <span className="font-semibold text-blue-500">{nextClass.code}</span>
      </p>
      {nextClass.location && (
        <p className="text-sm text-[#8F8F8F] mt-0.5">{nextClass.location}</p>
      )}

      <div className="mt-4">
        {hasTime ? (
          <div className="flex items-start gap-3 bg-[#F0F1F5] dark:bg-[#22263A] rounded-lg px-4 py-3 border border-[#E2E4EC] dark:border-[#2E3347]">
            <span className="text-blue-500 mt-0.5">◎</span>
            <div>
              <p className="text-sm font-medium text-[#464646] dark:text-[#C8C8C8]">You have time for a focus session</p>
              <p className="text-xs text-[#8F8F8F] mt-0.5">Start a 20-minute timer to make use of this break.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#8F8F8F] mb-2">Quick things you could do:</p>
            {suggestions.map((task) => (
              <div key={task} className="flex items-center gap-2.5 text-sm text-[#464646] dark:text-[#C8C8C8]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#60CCD4] shrink-0" />
                {task}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
