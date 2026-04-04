"use client";

import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import type { ClassInfo } from "@/hooks/useClasses";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ClassCardProps {
  classInfo: ClassInfo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ClassCard({ classInfo, onToggle, onDelete }: ClassCardProps) {
  return (
    <Card className={`transition-opacity ${!classInfo.enabled ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {classInfo.code}
            </h3>
            <Toggle
              enabled={classInfo.enabled}
              onChange={() => onToggle(classInfo.id)}
            />
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
          onClick={() => onDelete(classInfo.id)}
          className="text-red-500 hover:text-red-700 shrink-0"
        >
          Remove
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
                {s.startTime} - {s.endTime}
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
            {classInfo.externalLinks.slice(0, 5).map((link, i) => (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline truncate max-w-[200px]"
              >
                {new URL(link).hostname}
              </a>
            ))}
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
  );
}
