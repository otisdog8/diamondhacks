"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ClassList } from "@/components/dashboard/ClassList";
import { CrawlExternalUrl } from "@/components/dashboard/CrawlExternalUrl";
import { SmartDayView } from "@/components/productivity/SmartDayView";
import { ScheduleChat } from "@/components/dashboard/ScheduleChat";
import { CalendarExport } from "@/components/calendar/CalendarExport";
import { useClasses } from "@/hooks/useClasses";
import { useTravelPreferences } from "@/hooks/useTravelPreferences";
import { ALL_RESIDENCES, locationLabel } from "@/lib/travel/walking-times";
import Link from "next/link";

type Tab = "today" | "classes";

export default function DashboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("today");
  const { classes, fetchClasses } = useClasses();
  const { prefs, setHomeBase } = useTravelPreferences();
  const [dismissed, setDismissed] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);

  const showTravelBanner = !prefs.homeBase && classes.length > 0 && !dismissed;

  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name     = user?.username
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1)
    : "";
  const dateLabel = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">

      {/* Travel home base prompt */}
      {showTravelBanner && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-4 py-3">
          <span className="text-orange-500 text-lg">🚶</span>
          <p className="text-sm text-orange-800 dark:text-orange-300 flex-1">
            Set your residence for walking time estimates between classes.
          </p>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setHomeBase(e.target.value);
            }}
            className="text-sm rounded-lg border border-orange-200 dark:border-orange-700 bg-white dark:bg-[#1A1D27] px-2 py-1.5 text-[#464646] dark:text-[#C8C8C8] focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">Choose residence…</option>
            {ALL_RESIDENCES.map((r) => (
              <option key={r} value={r}>{locationLabel(r)}</option>
            ))}
          </select>
          <button
            onClick={() => setDismissed(true)}
            className="text-orange-400 hover:text-orange-600 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-medium text-[#8F8F8F] uppercase tracking-widest">{dateLabel}</p>
          {name && (
            <h1 className="text-xl font-semibold text-[#000000] dark:text-[#F5F6F8] mt-0.5">
              {greeting}, {name}
            </h1>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/canvas">
            <button className="inline-flex items-center justify-center rounded-lg bg-white dark:bg-[#1A1D27] hover:bg-[#F0F1F5] dark:hover:bg-[#22263A] text-[#464646] dark:text-[#C8C8C8] border border-[#D3D3D3] dark:border-[#2E3347] px-4 py-2 text-sm font-medium transition-all">
              Import from Canvas
            </button>
          </Link>
          <button
            onClick={() => setShowExportPanel(true)}
            className="inline-flex items-center justify-center rounded-lg bg-white dark:bg-[#1A1D27] hover:bg-[#F0F1F5] dark:hover:bg-[#22263A] text-[#464646] dark:text-[#C8C8C8] border border-[#D3D3D3] dark:border-[#2E3347] px-4 py-2 text-sm font-medium transition-all"
          >
            Export to Google
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b border-[#D3D3D3] dark:border-[#2E3347]">
        {(["today", "classes"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px
              ${
                tab === t
                  ? "border-blue-500 text-[#000000] dark:text-[#F5F6F8]"
                  : "border-transparent text-[#8F8F8F] hover:text-[#464646] dark:hover:text-[#C8C8C8] hover:border-[#D3D3D3]"
              }`}
          >
            {t === "today" ? "Today" : "My Classes"}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === "today" ? (
        <SmartDayView />
      ) : (
        <div className="space-y-6">
          <ClassList />
          <CrawlExternalUrl />
          <ScheduleChat onClassUpdated={fetchClasses} />
        </div>
      )}

      {/* ── Export slide-over panel ── */}
      {showExportPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowExportPanel(false)}
          />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#1A1D27] shadow-2xl overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between border-b border-[#EBEBEB] dark:border-[#1E2235] bg-white dark:bg-[#1A1D27] px-6 py-4 z-10">
              <h2 className="text-lg font-semibold text-[#000000] dark:text-[#F5F6F8]">
                Google Calendar Export
              </h2>
              <button
                onClick={() => setShowExportPanel(false)}
                className="rounded-lg p-2 text-[#8F8F8F] hover:text-[#464646] hover:bg-[#F0F1F5] dark:hover:bg-[#22263A] transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <CalendarExport />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
