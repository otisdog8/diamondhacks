"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ClassList } from "@/components/dashboard/ClassList";
import { CrawlExternalUrl } from "@/components/dashboard/CrawlExternalUrl";
import { SmartDayView } from "@/components/productivity/SmartDayView";
import { useClasses } from "@/hooks/useClasses";
import { useTravelPreferences } from "@/hooks/useTravelPreferences";
import { ALL_RESIDENCES, locationLabel } from "@/lib/travel/walking-times";
import Link from "next/link";

type Tab = "today" | "classes";

function HeroBanner() {
  const { user } = useAuth();
  const name = user?.username
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1)
    : "there";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#23607C] to-[#1B4457] px-8 py-11 shadow-[0_2px_20px_rgba(27,68,87,0.20)]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/[0.06] blur-3xl" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#9BBDCC]/70">
        Welcome back
      </p>
      <h1 className="mt-2 text-[2.25rem] font-semibold leading-tight tracking-tight text-white">
        Hi {name}!
      </h1>
      <p className="mt-3 max-w-[26rem] text-[0.9375rem] leading-relaxed text-[#9BBDCC]">
        Your classes, free time, and upcoming deadlines — all in one place.
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("today");
  const { classes } = useClasses();
  const { prefs, setHomeBase } = useTravelPreferences();
  const [dismissed, setDismissed] = useState(false);

  const showTravelBanner = !prefs.homeBase && classes.length > 0 && !dismissed;

  return (
    <div className="space-y-6">
      {/* Travel home base prompt */}
      {showTravelBanner && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3">
          <span className="text-orange-400 text-lg">🚶</span>
          <p className="text-sm text-orange-700 flex-1">
            Set your residence for walking time estimates between classes.
          </p>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setHomeBase(e.target.value);
            }}
            className="text-sm rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-400"
          >
            <option value="">Choose residence...</option>
            {ALL_RESIDENCES.map((r) => (
              <option key={r} value={r}>{locationLabel(r)}</option>
            ))}
          </select>
          <button
            onClick={() => setDismissed(true)}
            className="text-orange-300 hover:text-orange-500 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sky-400 mt-0.5 text-sm">
            {new Date().toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Link href="/calendar">
          <button className="inline-flex items-center justify-center rounded-xl bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 px-4 py-2 text-sm font-medium transition-all">
            Export to Calendar
          </button>
        </Link>
      </div>

      {/* ── External crawl utility ───────────────────────────────────────────── */}
      <CrawlExternalUrl />

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["today", "classes"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px
              ${
                tab === t
                  ? "border-[#1B4457] text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            {t === "today" ? "Today" : "My Classes"}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────────── */}
      {tab === "today" ? (
        <div className="space-y-6">
          <HeroBanner />
          <SmartDayView />
        </div>
      ) : (
        <ClassList />
      )}

    </div>
  );
}
