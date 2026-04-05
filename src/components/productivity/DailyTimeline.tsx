"use client";

import { useState, useEffect } from "react";
import type { ClassEvent } from "./types";
import { parseLocationToBuilding, getWalkingMinutes } from "@/lib/travel/walking-times";

interface TravelInfo {
  walkingMinutes: number;
  toBuilding: string;
}

interface TimelineItem {
  kind: "class" | "gap" | "now";
  event?: ClassEvent;
  durationMins?: number;
  label?: string;
  travel?: TravelInfo;
}

function computeGapTravel(
  prevEvent: ClassEvent | undefined,
  nextEvent: ClassEvent,
  homeBase: string | null,
): TravelInfo | undefined {
  const toBuilding = nextEvent.location ? parseLocationToBuilding(nextEvent.location) : null;
  if (!toBuilding) return undefined;

  let fromName: string | null = null;
  if (prevEvent?.location) {
    fromName = parseLocationToBuilding(prevEvent.location);
  }
  if (!fromName) fromName = homeBase;
  if (!fromName || fromName === toBuilding) return undefined;

  const mins = getWalkingMinutes(fromName, toBuilding);
  if (mins == null || mins === 0) return undefined;
  return { walkingMinutes: mins, toBuilding };
}

function buildTimeline(events: ClassEvent[], now: Date, homeBase: string | null): TimelineItem[] {
  if (events.length === 0) return [];

  const items: TimelineItem[] = [];
  const sorted = [...events].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  let nowInserted = false;

  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i];
    const prev = sorted[i - 1];

    const gapStart = prev ? prev.endTime : null;
    if (gapStart) {
      const gapMins = (event.startTime.getTime() - gapStart.getTime()) / 60_000;
      if (gapMins >= 5) {
        if (!nowInserted && now > gapStart && now < event.startTime) {
          items.push({ kind: "now" });
          nowInserted = true;
        }
        const travel = computeGapTravel(prev, event, homeBase);
        items.push({ kind: "gap", durationMins: gapMins, travel });
      }
    } else if (i === 0) {
      const travel = computeGapTravel(undefined, event, homeBase);
      if (travel) {
        items.push({ kind: "gap", durationMins: travel.walkingMinutes + 2, travel });
      }
    }

    if (!nowInserted && now < event.startTime) {
      items.push({ kind: "now" });
      nowInserted = true;
    }

    const isPast    = event.endTime <= now;
    const isCurrent = event.startTime <= now && now < event.endTime;
    items.push({ kind: "class", event, label: isCurrent ? "now" : isPast ? "past" : undefined });
  }

  if (!nowInserted) items.push({ kind: "now" });
  return items;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

interface DailyTimelineProps {
  events: ClassEvent[];
  nextDay?: { dayName: string; events: ClassEvent[] } | null;
  homeBase?: string | null;
}

export function DailyTimeline({ events, nextDay, homeBase }: DailyTimelineProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Empty state
  if (events.length === 0) {
    if (nextDay) {
      return (
        <div className="bg-white dark:bg-[#1A1D27] border border-[#EBEBEB] dark:border-[#1E2235] rounded-xl shadow-sm p-5">
          <p className="text-xs font-semibold text-[#8F8F8F] uppercase tracking-widest mb-3">
            Coming up · {nextDay.dayName}
          </p>
          <div className="space-y-2">
            {nextDay.events.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 rounded-lg bg-[#F5F6F8] dark:bg-[#22263A] border border-[#E2E4EC] dark:border-[#2E3347] px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-[#000000] dark:text-[#F5F6F8]">{event.code}</span>
                    {event.type && (
                      <span className="text-xs text-[#8F8F8F] capitalize">
                        · {event.type === "office_hours" ? "OH" : event.type}
                      </span>
                    )}
                    {event.type === "office_hours" && event.host && (
                      <span className="text-xs text-[#60CCD4]">({event.host})</span>
                    )}
                  </div>
                  <p className="text-xs text-[#8F8F8F] truncate mt-0.5">{event.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-[#464646] dark:text-[#C8C8C8]">
                    {event.startTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-[#8F8F8F]">
                    {event.endTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                {event.location && (
                  <p className="text-xs text-[#8F8F8F]">{event.location}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-[#1A1D27] border border-[#EBEBEB] dark:border-[#1E2235] rounded-xl shadow-sm p-5">
        <p className="text-xs font-semibold text-[#8F8F8F] uppercase tracking-widest mb-3">Today</p>
        <div className="py-8 text-center">
          <p className="text-sm text-[#8F8F8F]">No classes scheduled today</p>
        </div>
      </div>
    );
  }

  const items = buildTimeline(events, now, homeBase ?? null);

  return (
    <div className="bg-white dark:bg-[#1A1D27] border border-[#EBEBEB] dark:border-[#1E2235] rounded-xl shadow-sm p-5">
      <p className="text-xs font-semibold text-[#8F8F8F] uppercase tracking-widest mb-4">Today</p>

      <div className="relative pl-5">
        {/* Vertical rail */}
        <div className="absolute left-1.5 top-0 bottom-0 w-px bg-[#E2E4EC] dark:bg-[#2E3347]" />

        <div className="space-y-1">
          {items.map((item, idx) => {
            if (item.kind === "now") {
              return (
                <div key={`now-${idx}`} className="relative flex items-center gap-3 py-1">
                  <div className="absolute -left-[17px] w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-100 dark:ring-blue-900" />
                  <span className="text-xs font-semibold text-blue-500 uppercase tracking-widest">
                    Now
                  </span>
                </div>
              );
            }

            if (item.kind === "gap") {
              const mins = Math.round(item.durationMins ?? 0);
              const travel = item.travel;
              const freeMins = travel ? Math.max(0, mins - travel.walkingMinutes - 2) : mins;
              return (
                <div key={`gap-${idx}`} className="relative flex flex-col gap-1 py-2 pl-2">
                  <div className="absolute -left-[15px] w-2 h-px bg-[#E2E4EC] dark:bg-[#2E3347]" />
                  {travel && (
                    <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 py-1.5 border border-orange-100 dark:border-orange-800">
                      <span className="text-orange-500 text-sm">🚶</span>
                      <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
                        {travel.walkingMinutes}m walk to {travel.toBuilding}
                      </span>
                    </div>
                  )}
                  {freeMins >= 5 && (
                    <div className="flex-1 flex items-center justify-between bg-[#EBF8FA] dark:bg-[#1A2F32] border border-[#60CCD4]/30 rounded-lg px-3 py-2">
                      <span className="text-sm text-[#1A7F8C] dark:text-[#60CCD4] font-medium">
                        {freeMins} min free
                      </span>
                      <span className="text-xs text-[#8F8F8F]">
                        {freeMins >= 30 ? "focus session" : freeMins >= 15 ? "quick review" : "short break"}
                      </span>
                    </div>
                  )}
                </div>
              );
            }

            if (item.kind === "class" && item.event) {
              const { event, label } = item;
              const isPast    = label === "past";
              const isCurrent = label === "now";

              return (
                <div
                  key={event.id}
                  className={`relative flex gap-3 py-1 pl-2 ${isPast ? "opacity-40" : ""}`}
                >
                  <div
                    className={`absolute -left-[15px] w-2 h-2 rounded-full mt-2 shrink-0 ${
                      isCurrent
                        ? "bg-blue-500"
                        : isPast
                        ? "bg-[#D3D3D3] dark:bg-[#2E3347]"
                        : "bg-[#C8C8C8] dark:bg-[#464646]"
                    }`}
                  />
                  <div
                    className={`flex-1 rounded-lg px-3 py-2.5 border ${
                      isCurrent
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                        : "bg-[#F5F6F8] dark:bg-[#22263A] border-[#E2E4EC] dark:border-[#2E3347]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${isCurrent ? "text-blue-600 dark:text-blue-400" : "text-[#000000] dark:text-[#F5F6F8]"}`}>
                            {event.code}
                          </span>
                          {isCurrent && (
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full">
                              Now
                            </span>
                          )}
                          {!isPast && !isCurrent && idx === items.findIndex(i => i.kind === "class" && (i as typeof item).label !== "past") && (
                            <span className="text-xs font-medium text-[#8F8F8F] bg-[#E2E4EC] dark:bg-[#2E3347] px-1.5 py-0.5 rounded-full">
                              Next up
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#8F8F8F] truncate mt-0.5">{event.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-[#464646] dark:text-[#C8C8C8]">{formatTime(event.startTime)}</p>
                        <p className="text-xs text-[#8F8F8F]">{formatTime(event.endTime)}</p>
                      </div>
                    </div>
                    {event.location && (
                      <p className="text-xs text-[#8F8F8F] mt-1">{event.location}</p>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}
