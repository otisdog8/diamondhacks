"use client";

import { useState, useEffect, useRef } from "react";
import { isSameDay, isToday, formatTime } from "./types";
import { CalendarEventCard } from "./CalendarEventCard";
import { EVENT_STYLE } from "./types";
import type { CalendarEvent } from "./types";

const START_HOUR = 7;
const END_HOUR = 22;
const PX_PER_HOUR = 72;
const TOTAL_PX = (END_HOUR - START_HOUR) * PX_PER_HOUR;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

function timeToPixels(date: Date): number {
  return (date.getHours() - START_HOUR + date.getMinutes() / 60) * PX_PER_HOUR;
}

interface LayoutEvent { event: CalendarEvent; col: number; totalCols: number; }

function layoutDayEvents(events: CalendarEvent[]): LayoutEvent[] {
  const sorted = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const result: LayoutEvent[] = sorted.map((e) => ({ event: e, col: 0, totalCols: 1 }));
  const cols: CalendarEvent[][] = [];
  for (let i = 0; i < sorted.length; i++) {
    let placed = false;
    for (let c = 0; c < cols.length; c++) {
      if (cols[c][cols[c].length - 1].endTime <= sorted[i].startTime) {
        cols[c].push(sorted[i]);
        result[i].col = c;
        placed = true;
        break;
      }
    }
    if (!placed) { result[i].col = cols.length; cols.push([sorted[i]]); }
  }
  for (let i = 0; i < result.length; i++) {
    let maxCol = result[i].col;
    for (let j = 0; j < result.length; j++) {
      if (i !== j && result[i].event.startTime < result[j].event.endTime && result[j].event.startTime < result[i].event.endTime) {
        maxCol = Math.max(maxCol, result[j].col);
      }
    }
    result[i].totalCols = maxCol + 1;
  }
  return result;
}

interface CalendarDayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string | null) => void;
  onNavigateToDate: (d: Date) => void;
  skippedEventIds?: string[];
  onToggleSkip?: (id: string) => void;
}

export function CalendarDayView({
  currentDate,
  events,
  selectedEventId,
  onSelectEvent,
  skippedEventIds = [],
  onToggleSkip,
}: CalendarDayViewProps) {
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const offset = timeToPixels(now) - 100;
      scrollRef.current.scrollTop = Math.max(0, offset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dayEvents = events
    .filter((e) => isSameDay(e.startTime, currentDate))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Layout overlapping events in columns
  const dayLayout = layoutDayEvents(dayEvents);

  const today = isToday(currentDate);
  const nowTop = timeToPixels(now);

  const selectedEvent = dayEvents.find((e) => e.id === selectedEventId);

  const dayLabel = currentDate.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex h-full">
      {/* Time grid */}
      <div className="flex flex-col flex-1">
        {/* Day header */}
        <div className="border-b border-stone-100 bg-white px-6 py-3 shrink-0 flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-semibold shrink-0
              ${today ? "bg-teal-500 text-white" : "text-stone-700 bg-stone-100"}`}
          >
            {currentDate.getDate()}
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-700">{dayLabel}</p>
            <p className="text-xs text-stone-400">
              {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Scrollable grid */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="flex" style={{ minHeight: `${TOTAL_PX}px` }}>
            {/* Time labels */}
            <div className="w-16 shrink-0 relative">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute right-3 text-xs text-stone-400"
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

            {/* Event column */}
            <div
              className={`flex-1 relative border-l border-stone-100 ${today ? "bg-teal-50/10" : ""}`}
              style={{ height: `${TOTAL_PX}px` }}
            >
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-stone-100"
                  style={{ top: `${(h - START_HOUR) * PX_PER_HOUR}px` }}
                />
              ))}
              {HOURS.map((h) => (
                <div
                  key={`h-${h}`}
                  className="absolute left-0 right-0 border-t border-stone-50"
                  style={{ top: `${(h - START_HOUR) * PX_PER_HOUR + PX_PER_HOUR / 2}px` }}
                />
              ))}

              {/* Current time */}
              {today && (
                <>
                  <div
                    className="absolute left-0 right-4 border-t-2 border-teal-400 z-10 pointer-events-none"
                    style={{ top: `${nowTop}px` }}
                  />
                  <div
                    className="absolute w-2.5 h-2.5 rounded-full bg-teal-400 z-10 pointer-events-none"
                    style={{ top: `${nowTop - 5}px`, left: "-5px" }}
                  />
                </>
              )}

              {/* Events */}
              {dayLayout.map(({ event, col, totalCols }) => {
                const top = timeToPixels(event.startTime);
                const height = Math.max(
                  28,
                  ((event.endTime.getTime() - event.startTime.getTime()) / 3_600_000) * PX_PER_HOUR - 2
                );
                const colWidth = 100 / totalCols;
                const leftPct = col * colWidth;
                return (
                  <CalendarEventCard
                    key={event.id}
                    event={event}
                    selected={event.id === selectedEventId}
                    onClick={() =>
                      onSelectEvent(
                        event.id === selectedEventId ? null : event.id
                      )
                    }
                    style={{
                      position: "absolute",
                      top,
                      height,
                      width: `calc(${colWidth}% - 4px)`,
                      left: `calc(${leftPct}% + 2px)`,
                      zIndex: event.id === selectedEventId ? 30 : 10 + col,
                    }}
                    className="shadow-sm"
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Event detail panel */}
      {selectedEvent && (
        <div className="w-72 border-l border-stone-100 bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-stone-100 flex items-start justify-between">
            <div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  EVENT_STYLE[selectedEvent.type].pill
                }`}
              >
                {EVENT_STYLE[selectedEvent.type].label}
              </span>
              <h3 className="text-sm font-semibold text-stone-800 mt-2 leading-snug">
                {selectedEvent.title}
              </h3>
            </div>
            <button
              onClick={() => onSelectEvent(null)}
              className="text-stone-400 hover:text-stone-600 text-lg leading-none ml-2"
            >
              ×
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <span className="text-stone-400">◷</span>
              <span>
                {formatTime(selectedEvent.startTime)}
                {selectedEvent.endTime &&
                  selectedEvent.endTime.getTime() !== selectedEvent.startTime.getTime() &&
                  ` – ${formatTime(selectedEvent.endTime)}`}
              </span>
            </div>
            {selectedEvent.location && (
              <div className="flex items-center gap-2 text-sm text-stone-600">
                <span className="text-stone-400">⌖</span>
                <span>{selectedEvent.location}</span>
              </div>
            )}
            {selectedEvent.host && (
              <div className="flex items-center gap-2 text-sm text-stone-600">
                <span className="text-stone-400">◉</span>
                <span>{selectedEvent.host}</span>
              </div>
            )}
            {selectedEvent.classCode && (
              <div className="flex items-center gap-2 text-sm text-stone-600">
                <span className="text-stone-400">◻</span>
                <span>{selectedEvent.classCode}</span>
              </div>
            )}
            {selectedEvent.description && (
              <p className="text-sm text-stone-500 pt-1 border-t border-stone-100">
                {selectedEvent.description}
              </p>
            )}
            {onToggleSkip && selectedEvent.type !== "travel" && (
              <button
                onClick={() => onToggleSkip(selectedEvent.id)}
                className={`text-xs mt-2 pt-2 border-t border-stone-100 w-full text-left ${
                  skippedEventIds.includes(selectedEvent.id)
                    ? "text-green-600 hover:text-green-700"
                    : "text-stone-400 hover:text-red-500"
                }`}
              >
                {skippedEventIds.includes(selectedEvent.id) ? "Mark as attending" : "Skip (no travel)"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
