"use client";

import { useState, useEffect, useRef } from "react";
import { isSameDay, isToday, formatShortTime, formatTime, EVENT_STYLE } from "./types";
import { CalendarEventCard } from "./CalendarEventCard";
import type { CalendarEvent } from "./types";

const START_HOUR = 7;
const END_HOUR = 22;
const PX_PER_HOUR = 64;
const TOTAL_PX = (END_HOUR - START_HOUR) * PX_PER_HOUR;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekDays(anchor: Date): Date[] {
  const d = new Date(anchor);
  const dow = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - dow); // Sunday
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

function timeToPixels(date: Date): number {
  return (date.getHours() - START_HOUR + date.getMinutes() / 60) * PX_PER_HOUR;
}

function durationToPixels(start: Date, end: Date): number {
  const mins = (end.getTime() - start.getTime()) / 60_000;
  return Math.max(24, (mins / 60) * PX_PER_HOUR);
}

interface LayoutEvent {
  event: CalendarEvent;
  col: number;
  totalCols: number;
}

function layoutDayEvents(events: CalendarEvent[]): LayoutEvent[] {
  const sorted = [...events].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );
  const result: LayoutEvent[] = sorted.map((e) => ({ event: e, col: 0, totalCols: 1 }));

  // Assign columns for overlapping events
  const cols: CalendarEvent[][] = [];
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    let placed = false;
    for (let c = 0; c < cols.length; c++) {
      const last = cols[c][cols[c].length - 1];
      if (last.endTime <= e.startTime) {
        cols[c].push(e);
        result[i].col = c;
        placed = true;
        break;
      }
    }
    if (!placed) {
      result[i].col = cols.length;
      cols.push([e]);
    }
  }

  // Calculate totalCols for each event (max col among overlapping events)
  for (let i = 0; i < result.length; i++) {
    let maxCol = result[i].col;
    for (let j = 0; j < result.length; j++) {
      if (i !== j) {
        const a = result[i].event;
        const b = result[j].event;
        if (a.startTime < b.endTime && b.startTime < a.endTime) {
          maxCol = Math.max(maxCol, result[j].col);
        }
      }
    }
    result[i].totalCols = maxCol + 1;
  }

  return result;
}

interface CalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string | null) => void;
  skippedEventIds?: string[];
  onToggleSkip?: (id: string) => void;
  noTravelTypes?: Set<string>;
  onNavigateToDate: (d: Date) => void;
}

export function CalendarWeekView({
  currentDate,
  events,
  selectedEventId,
  onSelectEvent,
  onNavigateToDate,
  skippedEventIds = [],
  onToggleSkip,
  noTravelTypes,
}: CalendarWeekViewProps) {
  const days = getWeekDays(currentDate);
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const offset = timeToPixels(now) - 80;
      scrollRef.current.scrollTop = Math.max(0, offset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nowTop = timeToPixels(now);
  const isCurrentWeek = days.some((d) => isToday(d));

  return (
    <div ref={containerRef} className="flex flex-col h-full relative">
      {/* Day headers */}
      <div className="flex border-b border-gray-100 dark:border-[#1E2235] bg-white dark:bg-[#1A1D27] shrink-0">
        <div className="w-14 shrink-0" /> {/* spacer for time col */}
        {days.map((day, i) => {
          const today = isToday(day);
          return (
            <div
              key={i}
              className="flex-1 py-3 text-center cursor-pointer hover:bg-sky-50/50 dark:hover:bg-[#22263A]/50 transition-colors"
              onClick={() => onNavigateToDate(day)}
            >
              <p className="text-xs font-semibold text-gray-400 dark:text-[#8F8F8F] uppercase tracking-wider">
                {DAY_LABELS[day.getDay()]}
              </p>
              <div
                className={`mx-auto mt-1 w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold
                  ${today ? "bg-blue-600 text-white" : "text-gray-900 dark:text-[#F5F6F8]"}`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-[#0F1117]">
        <div className="flex" style={{ minHeight: `${TOTAL_PX}px` }}>
          {/* Time labels */}
          <div className="w-14 shrink-0 relative bg-white dark:bg-[#0F1117]">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-xs text-gray-400 dark:text-[#8F8F8F]"
                style={{ top: `${(h - START_HOUR) * PX_PER_HOUR - 8}px` }}
              >
                {h === 12
                  ? "12pm"
                  : h < 12
                  ? `${h}am`
                  : `${h - 12}pm`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const dayEvents = events.filter((e) => isSameDay(e.startTime, day));
            const layout = layoutDayEvents(dayEvents);
            const today = isToday(day);

            return (
              <div
                key={di}
                className={`flex-1 relative border-l border-gray-100 dark:border-[#1E2235] overflow-hidden ${today ? "bg-blue-50/30 dark:bg-blue-900/10" : ""}`}
                style={{ height: `${TOTAL_PX}px` }}
              >
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-gray-100 dark:border-[#1E2235]"
                    style={{ top: `${(h - START_HOUR) * PX_PER_HOUR}px` }}
                  />
                ))}

                {/* Half-hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={`h-${h}`}
                    className="absolute left-0 right-0 border-t border-gray-50 dark:border-[#161820]"
                    style={{ top: `${(h - START_HOUR) * PX_PER_HOUR + PX_PER_HOUR / 2}px` }}
                  />
                ))}

                {/* Current time indicator */}
                {today && isCurrentWeek && (
                  <>
                    <div
                      className="absolute left-0 right-0 border-t-2 border-red-400 z-10 pointer-events-none"
                      style={{ top: `${nowTop}px` }}
                    />
                    <div
                      className="absolute w-2 h-2 rounded-full bg-red-400 z-10 pointer-events-none"
                      style={{ top: `${nowTop - 4}px`, left: "-4px" }}
                    />
                  </>
                )}

                {/* Events */}
                {layout.map(({ event, col, totalCols }) => {
                  const top = timeToPixels(event.startTime);
                  const height = durationToPixels(event.startTime, event.endTime);
                  // Overlapping events: divide space evenly, slight overlap via padding
                  const colWidth = 100 / totalCols;
                  const leftPct = col * colWidth;
                  const width = `calc(${colWidth}% - 2px)`;
                  const left = `calc(${leftPct}% + 1px)`;
                  const zIndex = event.id === selectedEventId ? 30 : 10 + col;

                  return (
                    <CalendarEventCard
                      key={event.id}
                      event={event}
                      selected={event.id === selectedEventId}
                      onClick={(e) => {
                        e.stopPropagation();
                        const selecting = event.id !== selectedEventId;
                        onSelectEvent(selecting ? event.id : null);
                        if (selecting && containerRef.current) {
                          const rect = containerRef.current.getBoundingClientRect();
                          setPopoverPos({
                            x: Math.min(e.clientX - rect.left, rect.width - 280),
                            y: Math.min(e.clientY - rect.top + 10, rect.height - 200),
                          });
                        } else {
                          setPopoverPos(null);
                        }
                      }}
                      style={{ position: "absolute", top, height, width, left, zIndex }}
                      className="rounded-lg shadow-sm"
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected event detail popover */}
      {selectedEventId && popoverPos && (() => {
        const ev = events.find((e) => e.id === selectedEventId);
        if (!ev) return null;
        const style = EVENT_STYLE[ev.type];
        return (
          <div
            className="absolute z-50 w-64 bg-white dark:bg-[#1A1D27] rounded-xl shadow-lg border border-gray-200 dark:border-[#2E3347] overflow-hidden"
            style={{ left: popoverPos.x, top: popoverPos.y }}
          >
            <div className="p-3 border-b border-gray-50 dark:border-[#1E2235] flex items-start justify-between">
              <div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.pill}`}>
                  {style.label}
                </span>
                <h3 className="text-sm font-semibold text-[#000000] dark:text-[#F5F6F8] mt-1.5 leading-snug">
                  {ev.title}
                </h3>
              </div>
              <button
                onClick={() => onSelectEvent(null)}
                className="text-[#8F8F8F] hover:text-[#464646] dark:hover:text-[#C8C8C8] text-lg leading-none ml-2"
              >
                ×
              </button>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-[#464646] dark:text-[#C8C8C8]">
                <span className="text-[#8F8F8F]">◷</span>
                <span>
                  {formatTime(ev.startTime)}
                  {ev.endTime && ev.endTime.getTime() !== ev.startTime.getTime() && ` – ${formatTime(ev.endTime)}`}
                </span>
              </div>
              {ev.location && (
                <div className="flex items-center gap-2 text-sm text-[#464646] dark:text-[#C8C8C8]">
                  <span className="text-[#8F8F8F]">⌖</span>
                  <span>{ev.location}</span>
                </div>
              )}
              {ev.host && (
                <div className="flex items-center gap-2 text-sm text-[#464646] dark:text-[#C8C8C8]">
                  <span className="text-[#8F8F8F]">◉</span>
                  <span>{ev.host}</span>
                </div>
              )}
              {ev.description && (
                <p className="text-xs text-[#8F8F8F] pt-1 border-t border-[#EBEBEB] dark:border-[#1E2235]">
                  {ev.description}
                </p>
              )}
              {onToggleSkip && ev.type !== "travel" && ev.type !== "final" && (() => {
                const isSkipped = skippedEventIds.includes(ev.id);
                const typeOff = (noTravelTypes ?? new Set()).has(ev.type);
                // Effective state: travel is off if type toggle is off OR individually skipped
                const effectivelyOff = typeOff || isSkipped;
                return (
                  <button
                    onClick={() => onToggleSkip(ev.id)}
                    className={`text-xs mt-1 pt-1 border-t border-[#EBEBEB] dark:border-[#1E2235] w-full text-left ${
                      effectivelyOff
                        ? "text-[#8F8F8F] hover:text-green-600"
                        : "text-[#8F8F8F] hover:text-red-500"
                    }`}
                  >
                    {effectivelyOff ? "Enable travel" : "Skip (no travel)"}
                  </button>
                );
              })()}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
