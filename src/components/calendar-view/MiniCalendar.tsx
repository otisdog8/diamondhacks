"use client";

import { useState } from "react";
import { isSameDay, isToday } from "./types";
import type { CalendarEvent } from "./types";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells: Date[] = [];
  for (let i = 0; i < firstDay.getDay(); i++) {
    const d = new Date(firstDay);
    d.setDate(d.getDate() - (firstDay.getDay() - i));
    cells.push(d);
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  let extra = 1;
  while (cells.length % 7 !== 0) {
    cells.push(new Date(year, month + 1, extra++));
  }
  return cells;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface MiniCalendarProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onSelectDate: (d: Date) => void;
}

export function MiniCalendar({ selectedDate, events, onSelectDate }: MiniCalendarProps) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const grid = getMonthGrid(viewYear, viewMonth);

  const prev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const next = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Days that have events
  const daysWithEvents = new Set(
    events.map((e) =>
      `${e.startTime.getFullYear()}-${e.startTime.getMonth()}-${e.startTime.getDate()}`
    )
  );

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prev} className="p-1 rounded hover:bg-[#F0F1F5] dark:hover:bg-[#22263A] text-[#8F8F8F] dark:text-[#8F8F8F] transition-colors text-sm">
          ‹
        </button>
        <span className="text-xs font-semibold text-[#464646] dark:text-[#C8C8C8]">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button onClick={next} className="p-1 rounded hover:bg-[#F0F1F5] dark:hover:bg-[#22263A] text-[#8F8F8F] dark:text-[#8F8F8F] transition-colors text-sm">
          ›
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((l, i) => (
          <div key={i} className="text-center text-xs text-[#8F8F8F] py-0.5 font-medium">
            {l}
          </div>
        ))}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {grid.map((day, idx) => {
          const inMonth = day.getMonth() === viewMonth;
          const today = isToday(day);
          const selected = isSameDay(day, selectedDate);
          const hasEvents = daysWithEvents.has(
            `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
          );

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(day)}
              className={`relative text-xs w-7 h-7 mx-auto flex items-center justify-center rounded-full transition-colors
                ${today && !selected ? "text-[#60CCD4] font-semibold" : ""}
                ${selected ? "bg-[#60CCD4] text-white font-semibold" : ""}
                ${!selected && !today && inMonth ? "text-[#464646] dark:text-[#C8C8C8] hover:bg-[#F0F1F5] dark:hover:bg-[#22263A]" : ""}
                ${!inMonth ? "text-[#C8C8C8] dark:text-[#2E3347]" : ""}
              `}
            >
              {day.getDate()}
              {hasEvents && !selected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#60CCD4]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
