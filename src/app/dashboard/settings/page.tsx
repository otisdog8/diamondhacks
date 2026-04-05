"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTravelPreferences } from "@/hooks/useTravelPreferences";
import { ALL_RESIDENCES, ALL_BUILDINGS, locationLabel } from "@/lib/travel/walking-times";
import type { LocationOverride } from "@/hooks/useTravelPreferences";
import { useState } from "react";

const TYPE_OPTIONS = [
  { key: "lectures",    label: "Lectures",     prefsKey: "travelForLectures"    as const },
  { key: "discussions", label: "Discussions",  prefsKey: "travelForDiscussions" as const },
  { key: "labs",        label: "Labs",         prefsKey: "travelForLabs"        as const },
  { key: "officeHours", label: "Office Hours", prefsKey: "travelForOfficeHours" as const },
];

/* ── Shared field classes ─────────────────────────────────────────────────────*/

const selectCls =
  "rounded-lg border border-[#D3D3D3] dark:border-[#2E3347] bg-white dark:bg-[#1A1D27] px-3 py-2 text-sm text-[#000000] dark:text-[#F5F6F8] focus:outline-none focus:ring-2 focus:ring-blue-500";

const checkboxCls =
  "rounded border-[#D3D3D3] dark:border-[#2E3347] text-blue-500 focus:ring-blue-500 w-4 h-4 accent-blue-500";

/* ── Reusable card wrappers ───────────────────────────────────────────────────*/

function PrimaryCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#1A1D27] border border-[#EBEBEB] dark:border-[#1E2235] rounded-xl p-6 shadow-sm space-y-4">
      {children}
    </div>
  );
}

function SecondaryCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#F0F1F5] dark:bg-[#161820] border border-[#E2E4EC] dark:border-[#2E3347] rounded-xl p-6 space-y-4">
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const {
    prefs, setHomeBase, setTravelEnabled,
    setTravelForType, addLocationOverride, removeLocationOverride,
  } = useTravelPreferences();

  const [showAddOverride, setShowAddOverride] = useState(false);
  const [overrideGap, setOverrideGap] = useState("30");
  const [overrideLocation, setOverrideLocation] = useState("");

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#000000] dark:text-[#F5F6F8]">Settings</h1>
        <p className="text-[#8F8F8F] dark:text-[#8F8F8F] mt-1 text-sm">
          Configure your campus location and travel preferences.
        </p>
      </div>

      {/* ── Your Residence — primary card ── */}
      <PrimaryCard>
        <div>
          <h2 className="text-base font-semibold text-[#000000] dark:text-[#F5F6F8]">Your Residence</h2>
          <p className="text-sm text-[#8F8F8F] dark:text-[#8F8F8F] mt-0.5">
            Used to calculate walking time to your first class each day and for Google Calendar travel events.
          </p>
        </div>
        <select
          value={prefs.homeBase ?? ""}
          onChange={(e) => setHomeBase(e.target.value || null)}
          className={`w-full max-w-xs ${selectCls}`}
        >
          <option value="">Not set</option>
          {ALL_RESIDENCES.map((r) => (
            <option key={r} value={r}>{locationLabel(r)}</option>
          ))}
        </select>
        {prefs.homeBase && (
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            Walking times will be calculated from {locationLabel(prefs.homeBase)}.
          </p>
        )}
      </PrimaryCard>

      {/* ── Travel Events — secondary card ── */}
      <SecondaryCard>
        <div>
          <h2 className="text-base font-semibold text-[#000000] dark:text-[#F5F6F8]">Travel Events</h2>
          <p className="text-sm text-[#8F8F8F] dark:text-[#8F8F8F] mt-0.5">
            Show walking time blocks before events in your calendar and daily timeline.
          </p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.travelEventsEnabled}
            onChange={(e) => setTravelEnabled(e.target.checked)}
            className={checkboxCls}
          />
          <span className="text-sm font-medium text-[#464646] dark:text-[#C8C8C8]">
            Enable travel blocks in calendar
          </span>
        </label>

        {prefs.travelEventsEnabled && (
          <div className="border-t border-[#D3D3D3] dark:border-[#2E3347] pt-4 space-y-4">
            <p className="text-sm font-medium text-[#464646] dark:text-[#C8C8C8]">
              Show travel time before:
            </p>
            <div className="space-y-2.5">
              {TYPE_OPTIONS.map(({ key, label, prefsKey }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs[prefsKey]}
                    onChange={(e) => setTravelForType(key, e.target.checked)}
                    className={checkboxCls}
                  />
                  <span className="text-sm text-[#464646] dark:text-[#C8C8C8]">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </SecondaryCard>

      {/* ── Location Overrides — secondary card ── */}
      {prefs.travelEventsEnabled && (
        <SecondaryCard>
          <div>
            <h2 className="text-base font-semibold text-[#000000] dark:text-[#F5F6F8]">Location Overrides</h2>
            <p className="text-sm text-[#8F8F8F] dark:text-[#8F8F8F] mt-0.5">
              If you spend long gaps at a specific location (like the library), set a rule so travel is calculated from there instead.
            </p>
          </div>

          {prefs.locationOverrides.length > 0 && (
            <div className="space-y-2">
              {prefs.locationOverrides.map((o: LocationOverride) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-lg border border-[#D3D3D3] dark:border-[#2E3347] bg-white dark:bg-[#1A1D27] px-3 py-2.5"
                >
                  <div className="text-sm text-[#464646] dark:text-[#C8C8C8]">
                    When gap &ge; <span className="font-semibold text-[#000000] dark:text-[#F5F6F8]">{o.minGapMinutes} min</span>,
                    {" "}walk from{" "}
                    <span className="font-semibold text-[#000000] dark:text-[#F5F6F8]">{locationLabel(o.location)}</span>
                  </div>
                  <button
                    onClick={() => removeLocationOverride(o.id)}
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-sm font-medium ml-3 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAddOverride ? (
            <div className="space-y-3 rounded-lg border border-[#D3D3D3] dark:border-[#2E3347] bg-white dark:bg-[#1A1D27] p-4">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="text-[#464646] dark:text-[#C8C8C8]">When gap is at least</span>
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={overrideGap}
                  onChange={(e) => setOverrideGap(e.target.value)}
                  className="w-16 text-center border border-[#D3D3D3] dark:border-[#2E3347] bg-white dark:bg-[#1A1D27] text-[#000000] dark:text-[#F5F6F8] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[#464646] dark:text-[#C8C8C8]">minutes, I&apos;ll be at:</span>
              </div>
              <select
                value={overrideLocation}
                onChange={(e) => setOverrideLocation(e.target.value)}
                className={`w-full ${selectCls}`}
              >
                <option value="">Select location...</option>
                <optgroup label="Landmarks">
                  <option value="Geisel">{locationLabel("Geisel")}</option>
                  <option value="Price">{locationLabel("Price")}</option>
                </optgroup>
                <optgroup label="Buildings">
                  {ALL_BUILDINGS.map((b) => (
                    <option key={b} value={b}>{locationLabel(b)}</option>
                  ))}
                </optgroup>
                <optgroup label="Residences">
                  {ALL_RESIDENCES.map((r) => (
                    <option key={r} value={r}>{locationLabel(r)}</option>
                  ))}
                </optgroup>
              </select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!overrideLocation}
                  onClick={() => {
                    addLocationOverride({
                      minGapMinutes: parseInt(overrideGap) || 30,
                      location: overrideLocation,
                      label: locationLabel(overrideLocation),
                    });
                    setShowAddOverride(false);
                    setOverrideLocation("");
                    setOverrideGap("30");
                  }}
                >
                  Add Rule
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddOverride(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setShowAddOverride(true)}>
              + Add Location Rule
            </Button>
          )}
        </SecondaryCard>
      )}

      {/* Auto Reminders */}
      <AutoReminderSettings />

      {/* Manual Email Test */}
      <EmailSettings />
    </div>
  );
}

// ── Auto Reminder Settings ────────────────────────────────────────

function AutoReminderSettings() {
  const [email, setEmail] = useState("");
  const [leaveEnabled, setLeaveEnabled] = useState(false);
  const [dueEnabled, setDueEnabled] = useState(false);
  const [minutesBefore, setMinutesBefore] = useState(5);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reminderId, setReminderId] = useState<string | null>(null);

  // Load existing auto-reminder config on mount
  useState(() => {
    fetch("/api/reminders").then((r) => r.json()).then((d) => {
      const reminders = d.reminders ?? [];
      // Look for our auto-reminder sentinel (classId = "__auto__")
      const auto = reminders.find((r: { classId: string }) => r.classId === "__auto__");
      if (auto) {
        setEmail(auto.destination || "");
        setMinutesBefore(auto.minutesBefore || 5);
        setLeaveEnabled(true);
        setDueEnabled(true);
        setReminderId(auto.id);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  });

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      if (!leaveEnabled && !dueEnabled) {
        // Delete existing reminder if disabling
        if (reminderId) {
          await fetch(`/api/reminders/${reminderId}`, { method: "DELETE" });
          setReminderId(null);
        }
      } else if (reminderId) {
        // Update existing
        await fetch(`/api/reminders/${reminderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: email,
            minutesBefore,
          }),
        });
      } else {
        // Create new auto-reminder sentinel
        const res = await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId: "__auto__",
            channel: "email",
            destination: email,
            minutesBefore,
            scheduledFor: new Date().toISOString(),
          }),
        });
        const data = await res.json();
        if (data.reminder?.id) setReminderId(data.reminder.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (!loaded) return null;

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Automatic Reminders</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Get email reminders before classes and when assignments are due. Runs automatically in the background.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Reminder email address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@ucsd.edu"
          className="w-full max-w-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={leaveEnabled}
            onChange={(e) => setLeaveEnabled(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
          />
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Leave-for-class reminders</span>
            <p className="text-xs text-gray-400">
              Email before you need to leave, based on walking time to the building.
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={dueEnabled}
            onChange={(e) => setDueEnabled(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
          />
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Assignment due-date reminders</span>
            <p className="text-xs text-gray-400">
              Email at 6 PM the day before an assignment is due.
            </p>
          </div>
        </label>
      </div>

      {leaveEnabled && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Remind me this many minutes before I need to leave
          </label>
          <select
            value={minutesBefore}
            onChange={(e) => setMinutesBefore(parseInt(e.target.value))}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            <option value={3}>3 minutes</option>
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
          </select>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || (!(leaveEnabled || dueEnabled) && !reminderId) || ((leaveEnabled || dueEnabled) && !email.trim())}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600">
            {leaveEnabled || dueEnabled ? "Auto-reminders enabled!" : "Auto-reminders disabled."}
          </span>
        )}
      </div>

      {(leaveEnabled || dueEnabled) && email && (
        <p className="text-xs text-gray-400">
          Reminders will be sent to <span className="font-medium">{email}</span> automatically while the server is running.
        </p>
      )}
    </Card>
  );
}

// ── Email Settings sub-component (manual test sends) ─────────────

interface ClassScheduleEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
  type: string;
}

interface ClassItem {
  id: string;
  code: string;
  name: string;
  schedule: ClassScheduleEntry[];
}

interface TodoItem {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  classId: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function EmailSettings() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: string; message: string } | null>(null);

  // Data for pickers
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSlotIdx, setSelectedSlotIdx] = useState("0");
  const [selectedTodoId, setSelectedTodoId] = useState("");

  // Load classes + todos on mount
  useState(() => {
    fetch("/api/classes").then((r) => r.json()).then((d) => {
      setClasses(d.classes ?? []);
      if (d.classes?.length) setSelectedClassId(d.classes[0].id);
    }).catch(() => {});
    fetch("/api/todos").then((r) => r.json()).then((d) => {
      const active = (d.todos ?? []).filter((t: TodoItem & { completed: boolean }) => !t.completed);
      setTodos(active);
      if (active.length) setSelectedTodoId(active[0].id);
    }).catch(() => {});
  });

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedSlot = selectedClass?.schedule[parseInt(selectedSlotIdx)] ?? null;
  const selectedTodo = todos.find((t) => t.id === selectedTodoId);

  const sendLeave = async () => {
    if (!email.trim()) { setResult({ type: "error", message: "Enter your email address." }); return; }
    if (!selectedClass || !selectedSlot) { setResult({ type: "error", message: "Select a class." }); return; }
    setSending(true);
    setResult(null);
    try {
      const [h, m] = selectedSlot.startTime.split(":").map(Number);
      const d = new Date(); d.setHours(h, m);
      const startLabel = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "leave", to: email,
          classCode: selectedClass.code,
          className: selectedClass.name,
          location: selectedSlot.location ?? "TBD",
          startTime: startLabel,
          walkingMinutes: 10,
          leaveBy: `${h}:${String(Math.max(0, m - 10)).padStart(2, "0")}`,
        }),
      });
      const data = await res.json();
      setResult({ type: data.success ? "success" : "error", message: data.message || data.error });
    } catch { setResult({ type: "error", message: "Failed to send." }); }
    finally { setSending(false); }
  };

  const sendTodo = async () => {
    if (!email.trim()) { setResult({ type: "error", message: "Enter your email address." }); return; }
    if (!selectedTodo) { setResult({ type: "error", message: "Select a todo." }); return; }
    setSending(true);
    setResult(null);
    try {
      const cls = classes.find((c) => c.id === selectedTodo.classId);
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "todo", to: email,
          todoTitle: selectedTodo.title,
          description: selectedTodo.description,
          dueDate: selectedTodo.dueDate ?? "No due date",
          classCode: cls?.code,
        }),
      });
      const data = await res.json();
      setResult({ type: data.success ? "success" : "error", message: data.message || data.error });
    } catch { setResult({ type: "error", message: "Failed to send." }); }
    finally { setSending(false); }
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Reminders</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Send yourself a reminder to leave for class or complete a task.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@ucsd.edu"
          className="w-full max-w-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Leave for class */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Leave for class</p>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSlotIdx("0"); }}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
            >
              {classes.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
            </select>
          </div>
          {selectedClass && selectedClass.schedule.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Session</label>
              <select
                value={selectedSlotIdx}
                onChange={(e) => setSelectedSlotIdx(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
              >
                {selectedClass.schedule.map((s, i) => (
                  <option key={i} value={i}>
                    {DAY_LABELS[s.dayOfWeek]} {s.startTime} {s.type}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button size="sm" onClick={sendLeave} disabled={sending}>
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>

      {/* Todo reminder */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Todo reminder</p>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-0.5">Task</label>
            <select
              value={selectedTodoId}
              onChange={(e) => setSelectedTodoId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
            >
              {todos.length === 0 && <option value="">No active todos</option>}
              {todos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}{t.dueDate ? ` (due ${t.dueDate})` : ""}
                </option>
              ))}
            </select>
          </div>
          <Button size="sm" variant="secondary" onClick={sendTodo} disabled={sending || todos.length === 0}>
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>

      {result && (
        <p className={`text-sm ${result.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {result.message}
        </p>
      )}

      <p className="text-xs text-gray-400">
        SMTP config: SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_ENABLED=true
      </p>
    </Card>
  );
}
