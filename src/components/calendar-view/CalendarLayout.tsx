"use client";

import { useState, useMemo } from "react";
import { CalendarTopBar } from "./CalendarTopBar";
import { CalendarSidebar } from "./CalendarSidebar";
import { CalendarMonthView } from "./CalendarMonthView";
import { CalendarWeekView } from "./CalendarWeekView";
import { CalendarDayView } from "./CalendarDayView";
import { TimeSelectionModal } from "./TimeSelectionModal";
import { useClasses } from "@/hooks/useClasses";
import { useGoogleCalendarEvents } from "@/hooks/useGoogleCalendarEvents";
import { useTravelPreferences } from "@/hooks/useTravelPreferences";
import { generateTravelEvents } from "@/lib/travel/generate-travel-events";
import { getQuarterDates, inferQuarterWeeks, getFirstDayInQuarter, getFinalExamDate, getMidtermDate } from "@/lib/quarter-dates";
import type { CalendarView, EventType, CalendarEvent } from "./types";
import type { NewCalendarEvent } from "./TimeSelectionModal";

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

/**
 * Generate CalendarEvents from class schedules using real quarter dates.
 * Falls back to relative weeks if no quarter dates are available.
 */
function classesToCalendarEvents(
  classes: ReturnType<typeof useClasses>["classes"]
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const cls of classes) {
    // Resolve quarter start date
    let quarterStart = cls.quarterStartDate;
    if (!quarterStart) {
      const known = getQuarterDates(cls.term);
      quarterStart = known?.start;
    }

    const weeks = inferQuarterWeeks(cls.term);

    for (let si = 0; si < cls.schedule.length; si++) {
      const slot = cls.schedule[si];
      const slotType = slot.type?.toLowerCase() ?? "";

      // Finals/midterms: generate a SINGLE event on the correct date, not weekly
      if (slotType === "final" || slotType === "midterm") {
        const examDate = slotType === "midterm"
          ? getMidtermDate(cls.term, slot.dayOfWeek)
          : getFinalExamDate(cls.term, slot.dayOfWeek);
        if (examDate) {
          const date = new Date(examDate + "T00:00:00");
          const label = slotType === "final" ? "FINAL" : "MIDTERM";
          events.push({
            id: `${slotType}-${cls.id}-s${si}`,
            title: `${label}: ${cls.code}`,
            classCode: cls.code,
            startTime: parseT(slot.startTime, date),
            endTime: parseT(slot.endTime, date),
            type: "final" as EventType,
            location: slot.location,
            description: `${cls.name} — ${label.charAt(0) + label.slice(1).toLowerCase()} Exam`,
          });
        }
        continue;
      }

      const type: EventType = slotType === "office_hours" || slotType.includes("office")
        ? "office_hours"
        : slotType.includes("lab")
        ? "lab"
        : slotType.includes("disc")
        ? "discussion"
        : "lecture";

      if (quarterStart) {
        // Use actual quarter dates
        const firstDateStr = getFirstDayInQuarter(quarterStart, slot.dayOfWeek);
        const firstDate = new Date(firstDateStr + "T00:00:00");

        for (let week = 0; week < weeks; week++) {
          const date = new Date(firstDate);
          date.setDate(firstDate.getDate() + week * 7);

          events.push({
            id: `cls-${cls.id}-s${si}-w${week}`,
            title: type === "office_hours" && slot.host ? `${cls.code} OH — ${slot.host}` : cls.code,
            classCode: cls.code,
            startTime: parseT(slot.startTime, date),
            endTime: parseT(slot.endTime, date),
            type,
            location: slot.location,
            description: cls.name,
            host: slot.host,
          });
        }
      } else {
        // Fallback: relative to current week (-1 to +3 weeks)
        const today = new Date();
        const mon = new Date(today);
        const dow = mon.getDay();
        mon.setDate(mon.getDate() - (dow === 0 ? 6 : dow - 1));
        mon.setHours(0, 0, 0, 0);

        for (let weekOffset = -1; weekOffset <= 3; weekOffset++) {
          const dayOffset = slot.dayOfWeek === 0 ? 6 : slot.dayOfWeek - 1;
          const date = new Date(mon);
          date.setDate(mon.getDate() + weekOffset * 7 + dayOffset);

          events.push({
            id: `cls-${cls.id}-${slot.dayOfWeek}-${slot.type}-w${weekOffset}`,
            title: type === "office_hours" && slot.host ? `${cls.code} OH — ${slot.host}` : cls.code,
            classCode: cls.code,
            startTime: parseT(slot.startTime, date),
            endTime: parseT(slot.endTime, date),
            type,
            location: slot.location,
            description: cls.name,
            host: slot.host,
          });
        }
      }
    }
  }

  return events;
}

/**
 * Convert Google Calendar events to our CalendarEvent format.
 * Tries to match against known class codes to use proper type styling.
 */
function googleEventsToCalendarEvents(
  googleEvents: ReturnType<typeof useGoogleCalendarEvents>["events"],
  classCodes: Set<string>,
): CalendarEvent[] {
  return googleEvents
    .filter((ge) => ge.start && ge.end && !ge.allDay)
    .map((ge) => {
      // Try to match to a class code
      const summary = ge.summary || "";
      let type: EventType = "google";
      let classCode: string | undefined;

      for (const code of classCodes) {
        if (summary.toLowerCase().includes(code.toLowerCase())) {
          classCode = code;
          const lower = summary.toLowerCase();
          type = lower.includes("office") || lower.includes(" oh")
            ? "office_hours"
            : lower.includes("lab")
            ? "lab"
            : lower.includes("disc")
            ? "discussion"
            : "lecture";
          break;
        }
      }

      return {
        id: `gcal-${ge.id}`,
        title: summary,
        classCode,
        startTime: new Date(ge.start),
        endTime: new Date(ge.end),
        type,
        location: ge.location,
        description: ge.description,
      };
    });
}

interface CalendarLayoutProps {
  /** If true, show Google Calendar events alongside class events */
  showGoogleEvents?: boolean;
}

export function CalendarLayout({ showGoogleEvents = true }: CalendarLayoutProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hiddenTypes, setHiddenTypes] = useState<Set<EventType>>(() => {
    // Office hours hidden by default — user can toggle on in sidebar
    return new Set<EventType>(["office_hours"]);
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [userEvents, setUserEvents] = useState<CalendarEvent[]>([]);

  const { classes } = useClasses();
  const { events: googleEvents, connected: googleConnected } = useGoogleCalendarEvents();
  const {
    prefs: travelPrefs, setHomeBase, setTravelEnabled,
    setTravelForType, addLocationOverride, removeLocationOverride,
    toggleSkippedEvent,
  } = useTravelPreferences();

  const classCodes = useMemo(
    () => new Set(classes.map((c) => c.code)),
    [classes]
  );

  const classEvents = useMemo(
    () => classesToCalendarEvents(classes),
    [classes]
  );

  const gCalEvents = useMemo(() => {
    if (!showGoogleEvents || !googleConnected) return [];
    return googleEventsToCalendarEvents(googleEvents, classCodes);
  }, [showGoogleEvents, googleConnected, googleEvents, classCodes]);

  // When Google events are loaded, deduplicate: if a Google event matches a class code,
  // prefer the Google version (it has the real calendar data)
  const baseEvents = useMemo(() => {
    if (gCalEvents.length === 0) return classEvents;

    // Build a set of (classCode, date, hour) keys from Google events
    const gCalKeys = new Set<string>();
    for (const ge of gCalEvents) {
      if (ge.classCode) {
        const key = `${ge.classCode}-${ge.startTime.toISOString().split("T")[0]}-${ge.startTime.getHours()}`;
        gCalKeys.add(key);
      }
    }

    // Filter out local class events that are duplicated in Google Calendar
    const deduped = classEvents.filter((ce) => {
      if (!ce.classCode) return true;
      const key = `${ce.classCode}-${ce.startTime.toISOString().split("T")[0]}-${ce.startTime.getHours()}`;
      return !gCalKeys.has(key);
    });

    return [...deduped, ...gCalEvents];
  }, [classEvents, gCalEvents]);

  const travelEvents = useMemo(() => {
    if (!travelPrefs.travelEventsEnabled) return [];
    // Sync hidden types with travel prefs — if OH is hidden, disable OH travel too
    const effectivePrefs = {
      ...travelPrefs,
      travelForOfficeHours: travelPrefs.travelForOfficeHours && !hiddenTypes.has("office_hours"),
      travelForLectures: travelPrefs.travelForLectures && !hiddenTypes.has("lecture"),
      travelForDiscussions: travelPrefs.travelForDiscussions && !hiddenTypes.has("discussion"),
      travelForLabs: travelPrefs.travelForLabs && !hiddenTypes.has("lab"),
    };
    return generateTravelEvents(baseEvents, travelPrefs.homeBase, effectivePrefs);
  }, [baseEvents, travelPrefs, hiddenTypes]);

  const allEvents = useMemo(
    () => [...baseEvents, ...travelEvents, ...userEvents],
    [baseEvents, travelEvents, userEvents]
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
    setCurrentDate(newEvent.startTime);
    if (view === "month") setView("day");
    setShowAddModal(false);
  };

  // Types that have travel disabled — used to hide "Skip" button for those types
  const noTravelTypes = useMemo(() => {
    const s = new Set<string>();
    if (!travelPrefs.travelForLectures) s.add("lecture");
    if (!travelPrefs.travelForDiscussions) s.add("discussion");
    if (!travelPrefs.travelForLabs) s.add("lab");
    if (!travelPrefs.travelForOfficeHours) s.add("office_hours");
    return s;
  }, [travelPrefs]);

  const sharedProps = {
    currentDate,
    events: visibleEvents,
    selectedEventId,
    onSelectEvent: setSelectedEventId,
    onNavigateToDate: (d: Date) => {
      setCurrentDate(d);
      if (view !== "day") setView("day");
    },
    skippedEventIds: travelPrefs.skippedEventIds,
    onToggleSkip: toggleSkippedEvent,
    noTravelTypes,
  };

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
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
          travelPrefs={travelPrefs}
          onHomeBaseChange={setHomeBase}
          onTravelToggle={setTravelEnabled}
          onTravelForType={setTravelForType}
          onAddLocationOverride={addLocationOverride}
          onRemoveLocationOverride={removeLocationOverride}
        />
        <main className="flex-1 overflow-hidden bg-white dark:bg-[#0F1117]">
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
