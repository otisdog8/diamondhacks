import type { ClassInfo } from "@/hooks/useClasses";

export interface ClassEvent {
  id: string;
  code: string;
  name: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  type?: string;
}

/** Types that are one-time events, not weekly recurring */
const ONE_TIME_TYPES = new Set(["final", "midterm"]);

function isRecurring(type?: string): boolean {
  if (!type) return true;
  return !ONE_TIME_TYPES.has(type.toLowerCase());
}

function parseTimeStr(timeStr: string, base: Date): Date {
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(am|pm)?$/i);
  if (!match) return base;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const p = match[3]?.toLowerCase();
  if (p === "pm" && h !== 12) h += 12;
  if (p === "am" && h === 12) h = 0;
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export function getTodaysEvents(classes: ClassInfo[]): ClassEvent[] {
  const today = new Date();
  const dow = today.getDay();
  const events: ClassEvent[] = [];

  classes.forEach((cls) => {
    cls.schedule.forEach((slot, i) => {
      if (slot.dayOfWeek === dow && isRecurring(slot.type)) {
        events.push({
          id: `${cls.id}-${i}`,
          code: cls.code,
          name: cls.name,
          startTime: parseTimeStr(slot.startTime, today),
          endTime: parseTimeStr(slot.endTime, today),
          location: slot.location,
          type: slot.type,
        });
      }
    });
  });

  return events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Find the next day (including today) that has at least one class. Returns null if no classes. */
export function getNextClassDay(classes: ClassInfo[]): { dayName: string; events: ClassEvent[] } | null {
  if (classes.length === 0) return null;

  const today = new Date();
  const todayDow = today.getDay();

  // Check up to 7 days ahead (starting from today)
  for (let offset = 0; offset < 7; offset++) {
    const checkDow = (todayDow + offset) % 7;
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + offset);

    const events: ClassEvent[] = [];
    classes.forEach((cls) => {
      cls.schedule.forEach((slot, i) => {
        if (slot.dayOfWeek === checkDow && isRecurring(slot.type)) {
          events.push({
            id: `${cls.id}-${i}`,
            code: cls.code,
            name: cls.name,
            startTime: parseTimeStr(slot.startTime, checkDate),
            endTime: parseTimeStr(slot.endTime, checkDate),
            location: slot.location,
            type: slot.type,
          });
        }
      });
    });

    if (events.length > 0) {
      events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      const dayName = offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : DAY_NAMES[checkDow];
      return { dayName, events };
    }
  }

  return null;
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
