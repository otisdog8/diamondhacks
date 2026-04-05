"use client";

import type { CalendarView } from "./types";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function getViewLabel(view: CalendarView, date: Date): string {
  if (view === "month") {
    return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  }
  if (view === "week") {
    const sun = new Date(date);
    sun.setDate(date.getDate() - date.getDay());
    const sat = new Date(sun);
    sat.setDate(sun.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    if (sun.getMonth() === sat.getMonth()) {
      return `${sun.toLocaleDateString([], opts)} – ${sat.getDate()}, ${sat.getFullYear()}`;
    }
    return `${sun.toLocaleDateString([], opts)} – ${sat.toLocaleDateString([], opts)}, ${sat.getFullYear()}`;
  }
  return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

interface CalendarTopBarProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  onNavigate: (dir: 1 | -1) => void;
  onToday: () => void;
  onAddEvent: () => void;
}

export function CalendarTopBar({ currentDate, view, onViewChange, onNavigate, onToday, onAddEvent }: CalendarTopBarProps) {
  const label = getViewLabel(view, currentDate);
  return (
    <header className="flex items-center h-11 px-4 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm shrink-0 gap-3">
      <button
        onClick={onAddEvent}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#163847] text-white hover:bg-[#1e4d5f] transition shrink-0 mr-1"
      >
        <span className="text-base leading-none">+</span> New
      </button>

      <div className="flex items-center gap-1">
        <button onClick={onToday} className="px-3 py-1.5 text-xs font-medium text-gray-600 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition">
          Today
        </button>
        <button onClick={() => onNavigate(-1)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition text-sm">‹</button>
        <button onClick={() => onNavigate(1)}  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition text-sm">›</button>
      </div>

      <h1 className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">{label}</h1>

      <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0 text-xs">
        {(["day", "week", "month"] as CalendarView[]).map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={`px-3 py-1.5 font-medium capitalize transition
              ${view === v ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50"}`}
          >
            {v}
          </button>
        ))}
      </div>
    </header>
  );
}
