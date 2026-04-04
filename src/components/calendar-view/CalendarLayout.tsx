"use client";

import { useState, useMemo } from "react";
import { CalendarTopBar } from "./CalendarTopBar";
import { CalendarSidebar } from "./CalendarSidebar";
import { CalendarMonthView } from "./CalendarMonthView";
import { CalendarWeekView } from "./CalendarWeekView";
import { CalendarDayView } from "./CalendarDayView";
import { TimeSelectionModal } from "./TimeSelectionModal";
import { useClasses } from "@/hooks/useClasses";
import type { CalendarView, EventType, CalendarEvent } from "./types";
import type { NewCalendarEvent } from "./TimeSelectionModal";

function productivityToCalendarEvents(
  classes: ReturnType<typeof useClasses>["classes"]
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const today = new Date();

  const mon = new Date(today);
  const dow = mon.getDay();
  mon.setDate(mon.getDate() - (dow === 0 ? 6 : dow - 1));
  mon.setHours(0, 0, 0, 0);

  function parseT(t: string, base: Date): Date {
    const m = t.trim().match(/^(\d+):(\d+)\s*(am|pm)?$/i);
    if (!m) return base;
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    const p = m[3]?.toLowerCase();
    if (p === "pm" && h !== 12) h += 12;
    if (p === "am" && h === 12) h = 0;
    const d = new Date(base);
    d.setHours(h, min, 0, 0);
    return d;
  }

  for (let weekOffset = -1; weekOffset <= 3; weekOffset++) {
    classes.forEach((cls) => {
      cls.schedule.forEach((slot, i) => {
        const dayOffset = slot.dayOfWeek === 0 ? 6 : slot.dayOfWeek - 1;
        const date = new Date(mon);
        date.setDate(mon.getDate() + weekOffset * 7 + dayOffset);

        const type: EventType = slot.type?.toLowerCase().includes("lab")
          ? "lab"
          : slot.type?.toLowerCase().includes("disc")
          ? "discussion"
          : "lecture";

        events.push({
          id: `cls-${cls.id}-${i}-w${weekOffset}`,
          title: cls.code,
          classCode: cls.code,
          startTime: parseT(slot.startTime, date),
          endTime: parseT(slot.endTime, date),
          type,
          location: slot.location,
          description: cls.name,
        });
      });
    });
  }

  return events;
}

export function CalendarLayout() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hiddenTypes, setHiddenTypes] = useState<Set<EventType>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [userEvents, setUserEvents] = useState<CalendarEvent[]>([]);

  const { classes } = useClasses();

  const baseEvents = useMemo<CalendarEvent[]>(() => {
    return productivityToCalendarEvents(classes);
  }, [classes]);

  const allEvents = useMemo(
    () => [...baseEvents, ...userEvents],
    [baseEvents, userEvents]
  );

  const visibleEvents = useMemo(
    () => allEvents.filter((e) => !hiddenTypes.has(e.type)),
    [allEvents, hiddenTypes]
  );

  const navigate = (dir: 1 | -1) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      else if (view === "week") d.setDate(d.getDate() + 7 * dir);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  };

  const goToDate = (d: Date) => {
    setCurrentDate(d);
    if (view === "month") setView("day");
  };

  const toggleType = (t: EventType) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const handleAddEvent = (newEvent: NewCalendarEvent) => {
    const event: CalendarEvent = {
      id: `user-${Date.now()}`,
      title: newEvent.title,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      type: newEvent.type,
    };
    setUserEvents((prev) => [...prev, event]);
    setSelectedEventId(event.id);
    // Navigate to the day of the new event
    setCurrentDate(newEvent.startTime);
    if (view === "month") setView("day");
    setShowAddModal(false);
  };

  const sharedProps = {
    currentDate,
    events: visibleEvents,
    selectedEventId,
    onSelectEvent: setSelectedEventId,
    onNavigateToDate: (d: Date) => {
      setCurrentDate(d);
      if (view !== "day") setView("day");
    },
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-sky-50 via-white to-cyan-50 z-40">
      <CalendarTopBar
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onNavigate={navigate}
        onToday={() => setCurrentDate(new Date())}
        onAddEvent={() => setShowAddModal(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <CalendarSidebar
          currentDate={currentDate}
          events={visibleEvents}
          selectedEventId={selectedEventId}
          hiddenTypes={hiddenTypes}
          onSelectEvent={setSelectedEventId}
          onNavigateToDate={goToDate}
          onViewChange={setView}
          onToggleType={toggleType}
        />
        <main className="flex-1 overflow-hidden bg-white/80 backdrop-blur-sm">
          {view === "month" && <CalendarMonthView {...sharedProps} />}
          {view === "week" && <CalendarWeekView {...sharedProps} />}
          {view === "day" && <CalendarDayView {...sharedProps} />}
        </main>
      </div>

      {showAddModal && (
        <TimeSelectionModal
          events={allEvents}
          initialDate={currentDate}
          onConfirm={handleAddEvent}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
