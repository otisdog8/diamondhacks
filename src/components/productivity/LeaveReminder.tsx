"use client";

import { useState, useEffect } from "react";
import type { ClassEvent } from "./types";

interface LeaveReminderProps {
  nextClass: ClassEvent;
  travelMinutes: number;
  onChangeTravelTime?: (mins: number) => void;
}

export function LeaveReminder({
  nextClass,
  travelMinutes,
  onChangeTravelTime,
}: LeaveReminderProps) {
  const [now, setNow] = useState(() => new Date());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(travelMinutes));

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  const leaveAt = new Date(nextClass.startTime.getTime() - travelMinutes * 60_000);
  const minsUntilLeave = (leaveAt.getTime() - now.getTime()) / 60_000;

  const isUrgent = minsUntilLeave <= 5 && minsUntilLeave > 0;
  const isLate   = minsUntilLeave <= 0;

  const leaveLabel = leaveAt.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  let statusText = "";
  let subText = "";

  if (isLate) {
    const minsLate = Math.abs(Math.floor(minsUntilLeave));
    statusText = minsLate === 0 ? "Leave now" : `${minsLate}m overdue`;
    subText = "Head to class";
  } else if (minsUntilLeave < 60) {
    statusText = `Leave in ${Math.ceil(minsUntilLeave)}m`;
    subText = `Depart by ${leaveLabel}`;
  } else {
    const h = Math.floor(minsUntilLeave / 60);
    const m = Math.round(minsUntilLeave % 60);
    statusText = `Leave in ${h}h${m > 0 ? ` ${m}m` : ""}`;
    subText = `Depart by ${leaveLabel}`;
  }

  const handleSaveTravel = () => {
    const val = parseInt(draft);
    if (!isNaN(val) && val >= 0 && onChangeTravelTime) {
      onChangeTravelTime(val);
    }
    setEditing(false);
  };

  const urgentBg = isLate || isUrgent
    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
    : "bg-white dark:bg-[#1A1D27] border-[#EBEBEB] dark:border-[#1E2235]";

  return (
    <div className={`rounded-xl border shadow-sm p-4 transition-colors ${urgentBg}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[#8F8F8F] uppercase tracking-widest mb-1">
            Leave reminder
          </p>
          <p className={`text-lg font-semibold ${isLate || isUrgent ? "text-amber-700 dark:text-amber-400" : "text-[#000000] dark:text-[#F5F6F8]"}`}>
            {statusText}
          </p>
          <p className="text-sm text-[#8F8F8F] mt-0.5">{subText}</p>
          <p className="text-xs text-[#8F8F8F] mt-1">
            for {nextClass.code}
            {nextClass.location ? ` · ${nextClass.location}` : ""}
          </p>
        </div>

        {/* Travel time editor */}
        <div className="text-right shrink-0">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={60}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTravel()}
                autoFocus
                className="w-12 text-sm text-center border border-[#D3D3D3] dark:border-[#2E3347] bg-white dark:bg-[#1A1D27] text-[#000000] dark:text-[#F5F6F8] rounded-lg px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-[#8F8F8F]">min</span>
              <button
                onClick={handleSaveTravel}
                className="text-blue-500 hover:text-blue-700 text-xs font-medium ml-1 transition-colors"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-[#8F8F8F] hover:text-[#464646] dark:hover:text-[#C8C8C8] transition-colors"
            >
              {travelMinutes}m walk ✎
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
