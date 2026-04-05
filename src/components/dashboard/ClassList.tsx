"use client";

import { useState, useMemo } from "react";
import { useClasses } from "@/hooks/useClasses";
import { useToast } from "@/components/ui/Toast";
import { ClassCard } from "./ClassCard";
import { WeekView } from "./WeekView";
import { EmptyState } from "./EmptyState";
import { Button } from "@/components/ui/Button";

type FilterTab = "all" | "enabled" | "disabled";
type ViewMode = "list" | "week";

function detectConflicts(classes: ReturnType<typeof useClasses>["classes"]): Set<string> {
  const conflictIds = new Set<string>();

  interface Slot {
    classId: string;
    day: number;
    start: number;
    end: number;
  }

  function parseTime(t: string): number {
    const m = t.trim().match(/^(\d+):(\d+)\s*(am|pm)?$/i);
    if (!m) return 0;
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    const p = m[3]?.toLowerCase();
    if (p === "pm" && h !== 12) h += 12;
    if (p === "am" && h === 12) h = 0;
    return h * 60 + min;
  }

  const slots: Slot[] = [];
  classes.forEach((cls) => {
    if (!cls.enabled) return;
    cls.schedule.forEach((s) => {
      const t = s.type?.toLowerCase() ?? "";
      if (t === "office_hours" || t === "final" || t === "midterm") return;
      slots.push({
        classId: cls.id,
        day: s.dayOfWeek,
        start: parseTime(s.startTime),
        end: parseTime(s.endTime),
      });
    });
  });

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (a.classId !== b.classId && a.day === b.day && a.start < b.end && b.start < a.end) {
        conflictIds.add(a.classId);
        conflictIds.add(b.classId);
      }
    }
  }

  return conflictIds;
}

export function ClassList() {
  const { classes, loading, error, toggleClass, deleteClass, enableAll, disableAll } =
    useClasses();
  const showToast = useToast();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [view, setView] = useState<ViewMode>("list");
  const [bulkLoading, setBulkLoading] = useState(false);

  const conflictIds = useMemo(() => detectConflicts(classes), [classes]);

  const filtered = useMemo(() => {
    return classes.filter((cls) => {
      const matchesSearch =
        search === "" ||
        cls.code.toLowerCase().includes(search.toLowerCase()) ||
        cls.name.toLowerCase().includes(search.toLowerCase()) ||
        (cls.instructor?.toLowerCase().includes(search.toLowerCase()) ?? false);

      const matchesFilter =
        filter === "all" ||
        (filter === "enabled" && cls.enabled) ||
        (filter === "disabled" && !cls.enabled);

      return matchesSearch && matchesFilter;
    });
  }, [classes, search, filter]);

  const handleEnableAll = async () => {
    setBulkLoading(true);
    try {
      await enableAll();
      showToast("All classes enabled for export", "success");
    } catch {
      showToast("Failed to enable all classes", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDisableAll = async () => {
    setBulkLoading(true);
    try {
      await disableAll();
      showToast("All classes disabled", "info");
    } catch {
      showToast("Failed to disable all classes", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-sky-50/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return <EmptyState />;
  }

  const enabledCount = classes.filter((c) => c.enabled).length;
  const conflictCount = conflictIds.size;

  return (
    <div className="space-y-4">
      {/* Stats + conflict warning */}
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm text-sky-500">
          {enabledCount} of {classes.length} classes enabled for calendar export
        </p>
        {conflictCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
            ⚠ {conflictCount} class{conflictCount !== 1 ? "es" : ""} with time conflicts
          </span>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-300 text-sm pointer-events-none">
            ⌕
          </span>
          <input
            type="text"
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-sky-200 bg-white text-sky-900 placeholder-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex rounded-lg border border-sky-200 overflow-hidden text-sm">
          {(["all", "enabled", "disabled"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 font-medium capitalize transition-colors
                ${
                  filter === tab
                    ? "bg-sky-500 text-white"
                    : "bg-white text-sky-500 hover:bg-sky-50"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-sky-200 overflow-hidden text-sm">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 font-medium transition-colors
              ${
                view === "list"
                  ? "bg-sky-500 text-white"
                  : "bg-white text-sky-500 hover:bg-sky-50"
              }`}
          >
            List
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1.5 font-medium transition-colors
              ${
                view === "week"
                  ? "bg-sky-500 text-white"
                  : "bg-white text-sky-500 hover:bg-sky-50"
              }`}
          >
            Week
          </button>
        </div>

        {/* Bulk actions */}
        <div className="flex gap-2 ml-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleEnableAll}
            disabled={bulkLoading || enabledCount === classes.length}
          >
            Enable All
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDisableAll}
            disabled={bulkLoading || enabledCount === 0}
          >
            Disable All
          </Button>
        </div>
      </div>

      {/* Content */}
      {view === "week" ? (
        <WeekView classes={filtered} />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sky-200 p-8 text-center">
          <p className="text-sky-400 text-sm">
            No classes match your search
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((cls) => (
            <ClassCard
              key={cls.id}
              classInfo={cls}
              onToggle={toggleClass}
              onDelete={deleteClass}
            />
          ))}
        </div>
      )}
    </div>
  );
}
