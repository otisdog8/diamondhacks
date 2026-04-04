"use client";

import { useState } from "react";
import { useClasses } from "@/hooks/useClasses";
import { getTodaysEvents, getNextClassDay } from "./types";
import { RightNowPanel } from "./RightNowPanel";
import { LeaveReminder } from "./LeaveReminder";
import { DailyTimeline } from "./DailyTimeline";
import { TinyTasks } from "./TinyTasks";
import { FocusTimer } from "./FocusTimer";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function SmartDayView() {
  const { classes, loading } = useClasses();
  const [travelMins, setTravelMins] = useState(10);

  const todayEvents = getTodaysEvents(classes);
  const hasClasses = classes.length > 0;

  const now = new Date();
  const nextClass = todayEvents.find((e) => e.startTime > now);
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
          onChangeTravelTime={setTravelMins}
        />
      )}

      {/* Main layout: timeline + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline — takes up 2/3 */}
        <div className="lg:col-span-2">
          <DailyTimeline
            events={todayEvents}
            nextDay={nextDay}
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
