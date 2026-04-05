"use client";

import { useState } from "react";
import { MiniCalendar } from "./MiniCalendar";
import { UpcomingEventsList } from "./UpcomingEventsList";
import { FocusTimer } from "@/components/productivity/FocusTimer";
import { TodoList } from "@/components/dashboard/TodoList";
import { EVENT_STYLE } from "./types";
import type { CalendarEvent, EventType, CalendarView } from "./types";
import { ALL_RESIDENCES, ALL_BUILDINGS, locationLabel } from "@/lib/travel/walking-times";
import type { TravelPreferences, LocationOverride } from "@/hooks/useTravelPreferences";

const ALL_TYPES: EventType[] = [
  "lecture",
  "discussion",
  "lab",
  "office_hours",
  "final",
  "travel",
  "study",
  "task",
  "reminder",
  "personal",
  "google",
];

interface CalendarSidebarProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedEventId: string | null;
  hiddenTypes: Set<EventType>;
  onSelectEvent: (id: string) => void;
  onNavigateToDate: (d: Date) => void;
  onViewChange: (v: CalendarView) => void;
  onToggleType: (t: EventType) => void;
  travelPrefs: TravelPreferences;
  onHomeBaseChange: (v: string | null) => void;
  onTravelToggle: (v: boolean) => void;
  onTravelForType: (type: string, enabled: boolean) => void;
  onAddLocationOverride: (o: Omit<LocationOverride, "id">) => void;
  onRemoveLocationOverride: (id: string) => void;
}

type SidebarSection = "upcoming" | "focus" | "tasks" | "filters" | "travel";

export function CalendarSidebar({
  currentDate,
  events,
  selectedEventId,
  hiddenTypes,
  onSelectEvent,
  onNavigateToDate,
  onToggleType,
  travelPrefs,
  onHomeBaseChange,
  onTravelToggle,
  onTravelForType,
  onAddLocationOverride,
  onRemoveLocationOverride,
}: CalendarSidebarProps) {
  const [openSection, setOpenSection] = useState<SidebarSection>("upcoming");

  const toggle = (s: SidebarSection) =>
    setOpenSection((prev) => (prev === s ? "upcoming" : s));

  const filteredEvents = events.filter((e) => !hiddenTypes.has(e.type));

  const now = new Date();
  const nextEvent = filteredEvents
    .filter((e) => e.startTime > now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];

  return (
    <aside className="w-48 border-r border-gray-200/80 dark:border-[#1E2235] bg-white/90 dark:bg-[#1A1D27] flex flex-col overflow-y-auto shrink-0">
      {/* Mini calendar */}
      <div className="p-4 border-b border-gray-200/60 dark:border-[#1E2235]">
        <MiniCalendar
          selectedDate={currentDate}
          events={filteredEvents}
          onSelectDate={onNavigateToDate}
        />
      </div>

      {/* Next up */}
      {nextEvent && (
        <div className="px-4 py-3 border-b border-gray-200/60 dark:border-[#1E2235]">
          <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2">
            Next up
          </p>
          <button
            onClick={() => onSelectEvent(nextEvent.id)}
            className="w-full text-left"
          >
            <div
              className={`rounded-xl px-3 py-2.5 ${EVENT_STYLE[nextEvent.type].card}`}
            >
              <p className="text-xs font-semibold leading-tight">
                {nextEvent.title}
              </p>
              <p className="text-xs opacity-70 mt-0.5">
                {nextEvent.startTime.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {nextEvent.location ? ` · ${nextEvent.location}` : ""}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Collapsible sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Upcoming events */}
        <div className="border-b border-gray-200/60 dark:border-[#1E2235]">
          <button
            onClick={() => toggle("upcoming")}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-[#8F8F8F] uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-[#22263A] transition-colors"
          >
            Upcoming
            <span className="text-sky-300 normal-case font-normal text-sm">
              {openSection === "upcoming" ? "−" : "+"}
            </span>
          </button>
          {openSection === "upcoming" && (
            <div className="px-3 pb-3">
              <UpcomingEventsList
                events={filteredEvents}
                selectedEventId={selectedEventId}
                onSelectEvent={onSelectEvent}
              />
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="border-b border-gray-200/60 dark:border-[#1E2235]">
          <button
            onClick={() => toggle("filters")}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-[#8F8F8F] uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-[#22263A] transition-colors"
          >
            Categories
            <span className="text-sky-300 normal-case font-normal text-sm">
              {openSection === "filters" ? "−" : "+"}
            </span>
          </button>
          {openSection === "filters" && (
            <div className="px-3 pb-3 space-y-1">
              {ALL_TYPES.map((type) => {
                const s = EVENT_STYLE[type];
                const hidden = hiddenTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => onToggleType(type)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors
                      ${hidden ? "opacity-40" : "hover:bg-gray-50 dark:hover:bg-[#22263A]"}`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                    <span className="text-slate-600 dark:text-[#C8C8C8] capitalize">{s.label}</span>
                    {hidden && (
                      <span className="ml-auto text-sky-300">hidden</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Travel settings */}
        <div className="border-b border-gray-200/60 dark:border-[#1E2235]">
          <button
            onClick={() => toggle("travel")}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-[#8F8F8F] uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-[#22263A] transition-colors"
          >
            Travel
            <span className="text-sky-300 normal-case font-normal text-sm">
              {openSection === "travel" ? "−" : "+"}
            </span>
          </button>
          {openSection === "travel" && (
            <TravelSettings
              prefs={travelPrefs}
              onHomeBaseChange={onHomeBaseChange}
              onTravelToggle={onTravelToggle}
              onTravelForType={onTravelForType}
              onAddOverride={onAddLocationOverride}
              onRemoveOverride={onRemoveLocationOverride}
            />
          )}
        </div>

        {/* Focus timer */}
        <div className="border-b border-gray-200/60 dark:border-[#1E2235]">
          <button
            onClick={() => toggle("focus")}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-[#8F8F8F] uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-[#22263A] transition-colors"
          >
            Focus timer
            <span className="text-sky-300 normal-case font-normal text-sm">
              {openSection === "focus" ? "−" : "+"}
            </span>
          </button>
          {openSection === "focus" && (
            <div className="px-3 pb-3">
              <FocusTimer />
            </div>
          )}
        </div>

        {/* Quick tasks */}
        <div>
          <button
            onClick={() => toggle("tasks")}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-[#8F8F8F] uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-[#22263A] transition-colors"
          >
            Tasks
            <span className="text-sky-300 normal-case font-normal text-sm">
              {openSection === "tasks" ? "−" : "+"}
            </span>
          </button>
          {openSection === "tasks" && (
            <div className="px-3 pb-3">
              <TodoList />
            </div>
          )}
        </div>
      </div>

      {/* Export to Google */}
      <div className="border-t border-gray-200/60 px-3 py-3">
        <a
          href="/calendar"
          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Export to Google Calendar
        </a>
      </div>
    </aside>
  );
}

// ── Travel Settings sub-component ──────────────────────────────────────────

const TYPE_TOGGLES: { key: string; label: string; prefsKey: keyof TravelPreferences }[] = [
  { key: "lectures", label: "Lectures", prefsKey: "travelForLectures" },
  { key: "discussions", label: "Discussions", prefsKey: "travelForDiscussions" },
  { key: "labs", label: "Labs", prefsKey: "travelForLabs" },
  { key: "officeHours", label: "Office Hours", prefsKey: "travelForOfficeHours" },
];

function TravelSettings({
  prefs,
  onHomeBaseChange,
  onTravelToggle,
  onTravelForType,
  onAddOverride,
  onRemoveOverride,
}: {
  prefs: TravelPreferences;
  onHomeBaseChange: (v: string | null) => void;
  onTravelToggle: (v: boolean) => void;
  onTravelForType: (type: string, enabled: boolean) => void;
  onAddOverride: (o: Omit<LocationOverride, "id">) => void;
  onRemoveOverride: (id: string) => void;
}) {
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [overrideGap, setOverrideGap] = useState("30");
  const [overrideLocation, setOverrideLocation] = useState("");

  const allLocations = [...ALL_RESIDENCES, ...ALL_BUILDINGS];

  return (
    <div className="px-3 pb-3 space-y-3">
      {/* Master toggle */}
      <label className="flex items-center gap-2 text-xs text-[#464646] dark:text-[#C8C8C8] cursor-pointer">
        <input
          type="checkbox"
          checked={prefs.travelEventsEnabled}
          onChange={(e) => onTravelToggle(e.target.checked)}
          className="rounded border-sky-300 text-sky-500 focus:ring-sky-400"
        />
        Show travel blocks
      </label>

      {prefs.travelEventsEnabled && (
        <>
          {/* Home base */}
          <div>
            <label className="text-xs text-[#8F8F8F] block mb-1">Home base</label>
            <select
              value={prefs.homeBase ?? ""}
              onChange={(e) => onHomeBaseChange(e.target.value || null)}
              className="w-full text-xs rounded-lg border border-[#D3D3D3] dark:border-[#2E3347] bg-white dark:bg-[#22263A] px-2 py-1.5 text-[#464646] dark:text-[#C8C8C8] focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              <option value="">Not set</option>
              {ALL_RESIDENCES.map((r) => (
                <option key={r} value={r}>{locationLabel(r)}</option>
              ))}
            </select>
          </div>

          {/* Per-type toggles */}
          <div>
            <p className="text-xs text-[#8F8F8F] mb-1.5">Show travel for:</p>
            <div className="space-y-1">
              {TYPE_TOGGLES.map(({ key, label, prefsKey }) => (
                <label key={key} className="flex items-center gap-2 text-xs text-[#464646] dark:text-[#C8C8C8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs[prefsKey] as boolean}
                    onChange={(e) => onTravelForType(key, e.target.checked)}
                    className="rounded border-sky-300 text-sky-500 focus:ring-sky-400"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Location overrides */}
          <div>
            <p className="text-xs text-[#8F8F8F] mb-1.5">During long gaps, I&apos;ll be at:</p>
            {prefs.locationOverrides.map((o) => (
              <div key={o.id} className="flex items-center gap-1.5 text-xs text-[#464646] dark:text-[#C8C8C8] mb-1">
                <span className="truncate flex-1">
                  {locationLabel(o.location)} (gap &ge; {o.minGapMinutes}m)
                </span>
                <button
                  onClick={() => onRemoveOverride(o.id)}
                  className="text-red-400 hover:text-red-600 shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
            {showAddOverride ? (
              <div className="space-y-1.5 mt-1">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[#8F8F8F] shrink-0">Gap &ge;</span>
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={overrideGap}
                    onChange={(e) => setOverrideGap(e.target.value)}
                    className="w-12 text-center border border-[#D3D3D3] dark:border-[#2E3347] bg-white dark:bg-[#22263A] text-[#464646] dark:text-[#C8C8C8] rounded px-1 py-0.5 text-xs"
                  />
                  <span className="text-[#8F8F8F]">min →</span>
                </div>
                <select
                  value={overrideLocation}
                  onChange={(e) => setOverrideLocation(e.target.value)}
                  className="w-full text-xs rounded border border-[#D3D3D3] dark:border-[#2E3347] bg-white dark:bg-[#22263A] px-2 py-1 text-[#464646] dark:text-[#C8C8C8]"
                >
                  <option value="">Select location...</option>
                  {allLocations.map((loc) => (
                    <option key={loc} value={loc}>{locationLabel(loc)}</option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      if (overrideLocation && overrideGap) {
                        onAddOverride({
                          minGapMinutes: parseInt(overrideGap) || 30,
                          location: overrideLocation,
                          label: locationLabel(overrideLocation),
                        });
                        setShowAddOverride(false);
                        setOverrideLocation("");
                        setOverrideGap("30");
                      }
                    }}
                    disabled={!overrideLocation}
                    className="text-xs text-sky-500 dark:text-sky-400 font-medium disabled:opacity-40"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddOverride(false)}
                    className="text-xs text-[#8F8F8F]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddOverride(true)}
                className="text-xs text-sky-500 hover:text-sky-400 mt-1"
              >
                + Add location rule
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
