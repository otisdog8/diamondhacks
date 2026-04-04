"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import type { ClassInfo } from "@/hooks/useClasses";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ClassCardProps {
  classInfo: ClassInfo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  hasConflict?: boolean;
}

export function ClassCard({
  classInfo,
  onToggle,
  onDelete,
  hasConflict = false,
}: ClassCardProps) {
  const showToast = useToast();
  const [toggling, setToggling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      await onToggle(classInfo.id);
      showToast(
        classInfo.enabled
          ? `${classInfo.code} disabled for export`
          : `${classInfo.code} enabled for export`,
        classInfo.enabled ? "info" : "success"
      );
    } catch {
      showToast(`Failed to update ${classInfo.code}`, "error");
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(classInfo.id);
      showToast(`${classInfo.code} removed`, "info");
    } catch {
      showToast(`Failed to remove ${classInfo.code}`, "error");
      setDeleting(false);
    }
    setConfirmDelete(false);
  };

  return (
    <>
      <Card
        className={`transition-opacity ${
          !classInfo.enabled ? "opacity-60" : ""
        } ${hasConflict ? "ring-2 ring-red-400 dark:ring-red-500" : ""}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {classInfo.code}
              </h3>
              <Toggle
                enabled={classInfo.enabled}
                onChange={handleToggle}
                disabled={toggling}
              />
              {hasConflict && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                  ⚠ Time conflict
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {classInfo.name}
            </p>
            {classInfo.instructor && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Instructor: {classInfo.instructor}
              </p>
            )}
            {classInfo.term && (
              <p className="text-xs text-gray-400 dark:text-gray-600">
                {classInfo.term}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
            className="text-red-500 hover:text-red-700 shrink-0"
          >
            {deleting ? "Removing…" : "Remove"}
          </Button>
        </div>

        {classInfo.schedule.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Schedule
            </p>
            {classInfo.schedule.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <span className="font-medium w-8">{DAY_NAMES[s.dayOfWeek]}</span>
                <span>
                  {s.startTime} – {s.endTime}
                </span>
                {s.location && (
                  <span className="text-gray-400">@ {s.location}</span>
                )}
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  {s.type}
                </span>
              </div>
            ))}
          </div>
        )}

        {classInfo.externalLinks.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              External Links
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {classInfo.externalLinks.slice(0, 5).map((link, i) => {
                let isUrl = false;
                let label = link;
                try {
                  const u = new URL(link);
                  isUrl = true;
                  label = u.hostname;
                } catch {
                  // Not a URL — just display the text as-is
                }
                return isUrl ? (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline truncate max-w-[200px]"
                  >
                    {label}
                  </a>
                ) : (
                  <span key={i} className="text-xs text-gray-500 truncate max-w-[200px]">
                    {label}
                  </span>
                );
              })}
              {classInfo.externalLinks.length > 5 && (
                <span className="text-xs text-gray-400">
                  +{classInfo.externalLinks.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {classInfo.lastScrapedAt && (
          <p className="mt-2 text-xs text-gray-400">
            Last scraped: {new Date(classInfo.lastScrapedAt).toLocaleString()}
          </p>
        )}
      </Card>

      {confirmDelete && (
        <ConfirmDialog
          title="Remove class?"
          message={`Remove ${classInfo.code} — ${classInfo.name}? This cannot be undone.`}
          confirmLabel="Remove"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
