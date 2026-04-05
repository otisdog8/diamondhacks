"use client";

import type { ClassInfo } from "@/hooks/useClasses";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8am–9pm
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DAY_INDICES = [1, 2, 3, 4, 5];
const PX_PER_HOUR = 64;
const START_HOUR = 8;
const GRID_HEIGHT = HOURS.length * PX_PER_HOUR;

const CLASS_COLORS = [
  "bg-blue-100 dark:bg-blue-900/60 border-blue-500 text-blue-900 dark:text-blue-100",
  "bg-purple-100 dark:bg-purple-900/60 border-purple-500 text-purple-900 dark:text-purple-100",
  "bg-emerald-100 dark:bg-emerald-900/60 border-emerald-500 text-emerald-900 dark:text-emerald-100",
  "bg-orange-100 dark:bg-orange-900/60 border-orange-500 text-orange-900 dark:text-orange-100",
  "bg-pink-100 dark:bg-pink-900/60 border-pink-500 text-pink-900 dark:text-pink-100",
  "bg-teal-100 dark:bg-teal-900/60 border-teal-500 text-teal-900 dark:text-teal-100",
  "bg-amber-100 dark:bg-amber-900/60 border-amber-500 text-amber-900 dark:text-amber-100",
  "bg-rose-100 dark:bg-rose-900/60 border-rose-500 text-rose-900 dark:text-rose-100",
];

function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(am|pm)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3]?.toLowerCase();
  if (period === "pm" && hours !== 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatHour(hour: number): string {
  if (hour === 12) return "12pm";
  if (hour === 0) return "12am";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

interface Session {
  cls: ClassInfo;
  location?: string;
  startMin: number;
  endMin: number;
  colorIdx: number;
  conflict: boolean;
}

function getSessionsForDay(
  classes: ClassInfo[],
  dayIndex: number,
  colorMap: Map<string, number>
): Session[] {
  const sessions: Omit<Session, "conflict">[] = [];
  classes.forEach((cls) => {
    cls.schedule.forEach((slot) => {
      const t = slot.type?.toLowerCase() ?? "";
      if (slot.dayOfWeek === dayIndex && t !== "final" && t !== "midterm") {
        sessions.push({
          cls,
          location: slot.location,
          startMin: parseTimeToMinutes(slot.startTime),
          endMin: parseTimeToMinutes(slot.endTime),
          colorIdx: colorMap.get(cls.id) ?? 0,
        });
      }
    });
  });

  // Detect conflicts
  return sessions.map((s, i) => ({
    ...s,
    conflict: sessions.some(
      (other, j) =>
        i !== j && s.startMin < other.endMin && other.startMin < s.endMin
    ),
  }));
}

interface WeekViewProps {
  classes: ClassInfo[];
}

export function WeekView({ classes }: WeekViewProps) {
  const colorMap = new Map<string, number>();
  classes.forEach((cls, i) => {
    colorMap.set(cls.id, i % CLASS_COLORS.length);
  });

  // Check if any class has Sat/Sun sessions
  const hasWeekend = classes.some((cls) =>
    cls.schedule.some((s) => s.dayOfWeek === 0 || s.dayOfWeek === 6)
  );
  const dayIndices = hasWeekend ? [0, 1, 2, 3, 4, 5, 6] : DAY_INDICES;
  const dayNames = hasWeekend
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : DAYS;

  if (classes.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          No classes to display in week view
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex" style={{ minWidth: "560px" }}>
        {/* Time labels */}
        <div className="w-14 shrink-0 border-r border-gray-200 dark:border-gray-700">
          <div className="h-10 border-b border-gray-200 dark:border-gray-700" />
          <div className="relative" style={{ height: `${GRID_HEIGHT}px` }}>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 flex justify-end pr-2"
                style={{
                  top: `${(hour - START_HOUR) * PX_PER_HOUR - 8}px`,
                  height: `${PX_PER_HOUR}px`,
                }}
              >
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatHour(hour)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Day columns */}
        {dayIndices.map((dayIndex, colIndex) => {
          const sessions = getSessionsForDay(classes, dayIndex, colorMap);
          return (
            <div
              key={dayIndex}
              className="flex-1 border-r last:border-r-0 border-gray-200 dark:border-gray-700"
            >
              <div className="h-10 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {dayNames[colIndex]}
                </span>
              </div>
              <div className="relative" style={{ height: `${GRID_HEIGHT}px` }}>
                {/* Hour gridlines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
                    style={{ top: `${(hour - START_HOUR) * PX_PER_HOUR}px` }}
                  />
                ))}

                {/* Class blocks */}
                {sessions.map(
                  ({ cls, location, startMin, endMin, colorIdx, conflict }, i) => {
                    const topPx = Math.max(
                      0,
                      ((startMin - START_HOUR * 60) / 60) * PX_PER_HOUR
                    );
                    const heightPx = Math.max(
                      22,
                      ((endMin - startMin) / 60) * PX_PER_HOUR - 2
                    );
                    const colorClass = CLASS_COLORS[colorIdx];
                    const isDisabled = !cls.enabled;

                    return (
                      <div
                        key={`${cls.id}-${i}`}
                        className={`absolute left-0.5 right-0.5 rounded border-l-2 px-1.5 py-1 overflow-hidden ${colorClass} ${
                          isDisabled ? "opacity-40" : ""
                        } ${conflict ? "ring-2 ring-red-400 ring-offset-0" : ""}`}
                        style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                        title={`${cls.code}${conflict ? " — TIME CONFLICT" : ""}`}
                      >
                        <p className="text-xs font-semibold leading-tight truncate">
                          {cls.code}
                        </p>
                        {heightPx > 36 && location && (
                          <p className="text-xs leading-tight truncate opacity-70">
                            {location}
                          </p>
                        )}
                        {conflict && (
                          <p className="text-xs font-bold text-red-600 dark:text-red-400 leading-tight">
                            ⚠ Conflict
                          </p>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-wrap gap-x-4 gap-y-2">
        {classes.map((cls, i) => (
          <div key={cls.id} className="flex items-center gap-1.5">
            <div
              className={`w-2.5 h-2.5 rounded-sm border-l-2 ${CLASS_COLORS[i % CLASS_COLORS.length]}`}
            />
            <span
              className={`text-xs ${
                cls.enabled
                  ? "text-gray-700 dark:text-gray-300"
                  : "text-gray-400 dark:text-gray-600 line-through"
              }`}
            >
              {cls.code}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
