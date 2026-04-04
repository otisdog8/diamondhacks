export type EventType =
  | "lecture"
  | "discussion"
  | "lab"
  | "study"
  | "task"
  | "reminder"
  | "personal"
  | "google";

export type CalendarView = "month" | "week" | "day";

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  type: EventType;
  location?: string;
  description?: string;
  classCode?: string;
}

// Full class string per type (no dynamic interpolation for Tailwind JIT)
export const EVENT_STYLE: Record<
  EventType,
  { card: string; dot: string; pill: string; label: string }
> = {
  lecture: {
    card: "bg-sky-100/80 border-l-2 border-l-sky-400 text-sky-800",
    dot: "bg-sky-400",
    pill: "bg-sky-100 text-sky-700",
    label: "Lecture",
  },
  discussion: {
    card: "bg-indigo-50/80 border-l-2 border-l-indigo-300 text-indigo-700",
    dot: "bg-indigo-300",
    pill: "bg-indigo-50 text-indigo-600",
    label: "Discussion",
  },
  lab: {
    card: "bg-amber-50/80 border-l-2 border-l-amber-300 text-amber-700",
    dot: "bg-amber-300",
    pill: "bg-amber-50 text-amber-600",
    label: "Lab",
  },
  study: {
    card: "bg-sky-50/80 border-l-2 border-l-sky-200 text-sky-600",
    dot: "bg-sky-200",
    pill: "bg-sky-50 text-sky-500",
    label: "Study",
  },
  task: {
    card: "bg-cyan-50/80 border-l-2 border-l-cyan-400 text-cyan-700",
    dot: "bg-cyan-400",
    pill: "bg-cyan-50 text-cyan-600",
    label: "Task",
  },
  reminder: {
    card: "bg-rose-50/70 border-l-2 border-l-rose-200 text-rose-600",
    dot: "bg-rose-200",
    pill: "bg-rose-50 text-rose-500",
    label: "Reminder",
  },
  personal: {
    card: "bg-white/80 border-l-2 border-l-slate-200 text-slate-600",
    dot: "bg-slate-300",
    pill: "bg-white text-slate-500",
    label: "Personal",
  },
  google: {
    card: "bg-emerald-50/80 border-l-2 border-l-emerald-300 text-emerald-700",
    dot: "bg-emerald-300",
    pill: "bg-emerald-50 text-emerald-600",
    label: "Google Calendar",
  },
};

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

export function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatShortTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, "0")}${suffix}`;
}
