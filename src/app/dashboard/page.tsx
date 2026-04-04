"use client";

import { useState } from "react";
import { ClassList } from "@/components/dashboard/ClassList";
import { CrawlExternalUrl } from "@/components/dashboard/CrawlExternalUrl";
import { SmartDayView } from "@/components/productivity/SmartDayView";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

type Tab = "today" | "classes";

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("today");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-sky-900">
            Dashboard
          </h1>
          <p className="text-sky-400 mt-0.5 text-sm">
            {new Date().toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/canvas">
            <Button variant="light">Import from Canvas</Button>
          </Link>
          <Link href="/calendar">
            <Button variant="secondary">Export to Calendar</Button>
          </Link>
        </div>
      </div>
      <CrawlExternalUrl />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-sky-100 -mb-2">
        {(["today", "classes"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px capitalize
              ${
                tab === t
                  ? "border-teal-500 text-sky-600"
                  : "border-transparent text-sky-400 hover:text-sky-600 hover:border-sky-200"
              }`}
          >
            {t === "today" ? "Today" : "My Classes"}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "today" ? <SmartDayView /> : <ClassList />}
    </div>
  );
}
