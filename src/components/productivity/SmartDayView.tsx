"use client";

import { useMemo } from "react";
import { useClasses } from "@/hooks/useClasses";
import { useTravelPreferences } from "@/hooks/useTravelPreferences";
import { getTodaysEvents, getNextClassDay } from "./types";
import type { ClassEvent } from "./types";
import { parseLocationToBuilding, getWalkingMinutes } from "@/lib/travel/walking-times";
import { RightNowPanel } from "./RightNowPanel";
import { LeaveReminder } from "./LeaveReminder";
import { DailyTimeline } from "./DailyTimeline";
import { TinyTasks } from "./TinyTasks";
import { FocusTimer } from "./FocusTimer";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

function computeTravelMinutes(
  events: ClassEvent[],
  nextClass: ClassEvent | undefined,
  homeBase: string | null,
): number {
  if (!nextClass?.location) return 10;
  const toBuilding = parseLocationToBuilding(nextClass.location);
  if (!toBuilding) return 10;

  // Find the most recent class before this one (current or just ended)
  const now = new Date();
  const prevClass = [...events]
    .filter((e) => e.id !== nextClass.id && e.endTime <= nextClass.startTime)
    .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())[0];

  let fromName: string | null = null;
  if (prevClass?.location) {
    fromName = parseLocationToBuilding(prevClass.location);
  }
  if (!fromName) fromName = homeBase;
  if (!fromName) return 10;
  if (fromName === toBuilding) return 0;

  const mins = getWalkingMinutes(fromName, toBuilding);
  return mins != null ? mins : 10;
}

export function SmartDayView() {
  const { classes, loading } = useClasses();
  const { prefs } = useTravelPreferences();

  const todayEvents = getTodaysEvents(classes);
  const hasClasses = classes.length > 0;

  const now = new Date();
  const nextClass = todayEvents.find((e) => e.startTime > now);

  const travelMins = useMemo(
    () => computeTravelMinutes(todayEvents, nextClass, prefs.homeBase),
    [todayEvents, nextClass, prefs.homeBase],
  );

  const showLeaveReminder =
    nextClass != null &&
    nextClass.startTime.getTime() - now.getTime() < 90 * 60_000;

  // If there are no classes today but classes exist, show the next class day
  const nextDay = todayEvents.length === 0 && hasClasses ? getNextClassDay(classes) : null;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-sky-50/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!hasClasses) {
    return (
      <div className="space-y-4">
        <div className="glass rounded-2xl p-6 text-center space-y-3">
          <p className="text-xl font-light text-sky-800">No classes yet</p>
          <p className="text-sm text-sky-400">
            Import your Canvas schedule to see your day here.
          </p>
          <Link href="/canvas">
            <Button>Import from Canvas</Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2" />
          <div className="flex flex-col gap-4">
            <TinyTasks />
            <FocusTimer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top: Right Now */}
      <RightNowPanel events={todayEvents} hasClasses={hasClasses} nextDay={nextDay} />

      {/* Leave reminder — only when approaching next class */}
      {showLeaveReminder && nextClass && (
        <LeaveReminder
          nextClass={nextClass}
          travelMinutes={travelMins}
        />
      )}

      {/* Main layout: timeline + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline — takes up 2/3 */}
        <div className="lg:col-span-2">
          <DailyTimeline
            events={todayEvents}
            nextDay={nextDay}
            homeBase={prefs.homeBase}
          />
        </div>

        {/* Sidebar — tasks + timer */}
        <div className="flex flex-col gap-4">
          <TinyTasks />
          <FocusTimer />
        </div>
      </div>
    </div>
  );
}
