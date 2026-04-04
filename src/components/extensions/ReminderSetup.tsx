"use client";
// ============================================================
// ReminderSetup component
// Drop into src/components/extensions/ReminderSetup.tsx
// ============================================================
import { useState, useEffect, useCallback } from "react";
import type { IReminder } from "@/lib/extensions/types";

interface Props {
  classId: string;
  className: string;
}

const MINUTES_OPTIONS = [5, 10, 15, 30, 60];

export function ReminderSetup({ classId, className }: Props) {
  const [reminders, setReminders] = useState<IReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [minutesBefore, setMinutesBefore] = useState(15);
  const [destination, setDestination] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadReminders = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/reminders");
    const data = await res.json();
    const classReminders = (data.reminders as IReminder[]).filter(
      (r) => r.classId === classId
    );
    setReminders(classReminders);
    setLoading(false);
  }, [classId]);

  useEffect(() => { loadReminders(); }, [loadReminders]);

  async function createReminder() {
    if (!destination.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const scheduledFor = new Date(Date.now() + minutesBefore * 60 * 1000).toISOString();
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, channel, minutesBefore, destination, scheduledFor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDestination("");
      await loadReminders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create reminder");
    } finally {
      setSaving(false);
    }
  }

  async function deleteReminder(id: string) {
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  async function sendNow(id: string) {
    setSending(id);
    setSuccess(null);
    try {
      const res = await fetch(`/api/reminders/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSuccess("Reminder sent!");
        await loadReminders();
      }
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Reminders — {className}
      </h3>

      {/* Create form */}
      <div className="space-y-3 mb-5">
        {/* Channel */}
        <div className="flex gap-2">
          {(["email", "sms"] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                channel === ch
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                  : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
              }`}
            >
              {ch === "email" ? "Email" : "SMS"}
            </button>
          ))}
        </div>

        {/* Minutes before */}
        <div className="flex gap-2">
          {MINUTES_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => setMinutesBefore(m)}
              className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                minutesBefore === m
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                  : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
              }`}
            >
              {m}m
            </button>
          ))}
        </div>

        {/* Destination */}
        <div className="flex gap-2">
          <input
            type={channel === "email" ? "email" : "tel"}
            placeholder={channel === "email" ? "you@example.com" : "+1 555 000 0000"}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            onClick={createReminder}
            disabled={saving || !destination.trim()}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-green-600 dark:text-green-400 mb-3 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
          {success}
        </p>
      )}

      {/* Existing reminders */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-2">Loading…</p>
      ) : reminders.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-2">No reminders yet.</p>
      ) : (
        <div className="space-y-2">
          {reminders.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 dark:text-gray-200 font-medium">
                  {r.minutesBefore} min before via {r.channel}
                </p>
                <p className="text-xs text-gray-400 truncate">{r.destination}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  r.status === "sent"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                    : r.status === "failed"
                    ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}
              >
                {r.status}
              </span>
              <button
                onClick={() => sendNow(r.id)}
                disabled={sending === r.id}
                className="text-xs text-purple-500 hover:text-purple-700 dark:hover:text-purple-300 disabled:opacity-50"
              >
                {sending === r.id ? "…" : "Send now"}
              </button>
              <button
                onClick={() => deleteReminder(r.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
