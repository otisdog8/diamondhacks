"use client";

import { isSameDay, isToday, startOfDay } from "./types";
import { CalendarEventCard } from "./CalendarEventCard";
import type { CalendarEvent } from "./types";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells: Date[] = [];

  // Fill from previous month to start on Sunday
  for (let i = 0; i < firstDay.getDay(); i++) {
    const d = new Date(firstDay);
    d.setDate(d.getDate() - (firstDay.getDay() - i));
    cells.push(d);
  }
  // Fill current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  // Fill next month to complete last row
  let extra = 1;
  while (cells.length % 7 !== 0) {
    cells.push(new Date(year, month + 1, extra++));
  }
  return cells;
}

function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events
    .filter((e) => isSameDay(e.startTime, day))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

interface CalendarMonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string | null) => void;
  onNavigateToDate: (d: Date) => void;
}

export function CalendarMonthView({
  currentDate,
  events,
  selectedEventId,
  onSelectEvent,
  onNavigateToDate,
}: CalendarMonthViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const grid = getMonthGrid(year, month);

  return (
    <div className="flex flex-col h-full select-none">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-sky-100/50 dark:border-[#1E2235]">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold text-sky-400 dark:text-[#60CCD4]/70 uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid cells */}
      <div
        className="flex-1 grid grid-cols-7"
        style={{ gridTemplateRows: `repeat(${grid.length / 7}, 1fr)` }}
      >
        {grid.map((day, idx) => {
          const inMonth = day.getMonth() === month;
          const today = isToday(day);
          const dayEvents = getEventsForDay(events, day);
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;

          return (
            <div
              key={idx}
              className={`border-b border-r border-sky-100/50 dark:border-[#1E2235] p-2 min-h-[100px] flex flex-col gap-1
                ${!inMonth ? "bg-sky-50/40 dark:bg-[#0D1014]" : "bg-white dark:bg-[#0F1117]"}
                hover:bg-sky-50/50 dark:hover:bg-[#161820] transition-colors cursor-pointer`}
              onClick={() => onNavigateToDate(day)}
            >
              {/* Date number */}
              <div className="flex items-center justify-end mb-0.5">
                <span
                  className={`text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium
                    ${today
                      ? "bg-sky-400 text-white"
                      : inMonth
                      ? "text-[#000000] dark:text-[#F5F6F8]"
                      : "text-[#C8C8C8] dark:text-[#464646]"
                    }`}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Events */}
              <div className="flex flex-col gap-0.5 flex-1">
                {visible.map((evt) => (
                  <CalendarEventCard
                    key={evt.id}
                    event={evt}
                    compact
                    selected={evt.id === selectedEventId}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(evt.id === selectedEventId ? null : evt.id);
                    }}
                  />
                ))}
                {overflow > 0 && (
                  <span className="text-xs text-sky-400 dark:text-[#60CCD4]/70 px-1">
                    +{overflow} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
