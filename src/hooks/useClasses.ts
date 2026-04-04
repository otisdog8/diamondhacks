"use client";

import { useState, useEffect, useCallback } from "react";

interface ClassSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
  type: string;
  recurrence?: string;
}

export interface ClassInfo {
  id: string;
  userId: string;
  canvasId: string;
  name: string;
  code: string;
  instructor: string;
  term: string;
  quarterStartDate?: string;
  quarterEndDate?: string;
  enabled: boolean;
  schedule: ClassSchedule[];
  rawData: Record<string, unknown>;
  externalLinks: string[];
  syllabusUrl?: string;
  description?: string;
  lastScrapedAt?: string;
  scrapeDepth: number;
  createdAt: string;
  updatedAt: string;
}

export function useClasses() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/classes");
      if (!res.ok) throw new Error("Failed to fetch classes");
      const data = await res.json();
      setClasses(data.classes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const toggleClass = async (classId: string) => {
    const res = await fetch(`/api/classes/${classId}/toggle`, {
      method: "PATCH",
    });
    if (!res.ok) throw new Error("Failed to toggle class");
    const data = await res.json();
    setClasses((prev) =>
      prev.map((c) => (c.id === classId ? data.class : c))
    );
    return data.class;
  };

  const deleteClass = async (classId: string) => {
    const res = await fetch(`/api/classes/${classId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete class");
    setClasses((prev) => prev.filter((c) => c.id !== classId));
  };

  const enableAll = async () => {
    const toEnable = classes.filter((c) => !c.enabled);
    await Promise.all(toEnable.map((c) => toggleClass(c.id)));
  };

  const disableAll = async () => {
    const toDisable = classes.filter((c) => c.enabled);
    await Promise.all(toDisable.map((c) => toggleClass(c.id)));
  };

  return { classes, loading, error, fetchClasses, toggleClass, deleteClass, enableAll, disableAll };
}
