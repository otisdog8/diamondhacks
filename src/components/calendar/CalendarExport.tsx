"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BrowserFrame } from "@/components/canvas/BrowserFrame";
import { useBrowserSession } from "@/hooks/useBrowserSession";
import { useClasses } from "@/hooks/useClasses";
import { useTravelPreferences } from "@/hooks/useTravelPreferences";
import { ALL_RESIDENCES, locationLabel } from "@/lib/travel/walking-times";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ExportMethod = "loading" | "api" | "browser-use";
type ApiStatus = "idle" | "connected" | "exporting" | "done" | "error";

interface CalendarOption {
  id: string;
  summary: string;
  primary: boolean;
}

export function CalendarExport() {
  const session = useBrowserSession("google");
  const { classes } = useClasses();
  const enabledClasses = classes.filter((c) => c.enabled);

  const [method, setMethod] = useState<ExportMethod>("loading");
  const [apiStatus, setApiStatus] = useState<ApiStatus>("idle");
  const [apiResult, setApiResult] = useState<{ eventsCreated: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");

  // Calendar selection
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState("primary");
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  // Travel export options — always uses the current travel prefs
  const { prefs: travelPrefs, setHomeBase: setTravelHomeBase } = useTravelPreferences();
  const [includeTravelEvents, setIncludeTravelEvents] = useState(true);
  const exportHomeBase = travelPrefs.homeBase;

  // Fetch available calendars once connected
  const fetchCalendars = useCallback(async () => {
    setLoadingCalendars(true);
    try {
      const res = await fetch("/api/calendar/calendars");
      if (!res.ok) return;
      const data = await res.json();
      setCalendars(data.calendars || []);
      // Default to primary
      const primary = (data.calendars || []).find((c: CalendarOption) => c.primary);
      if (primary) setSelectedCalendarId(primary.id);
    } catch { /* ignore */ }
    setLoadingCalendars(false);
  }, []);

  // Check URL params for OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      setMethod("api");
      setApiStatus("connected");
      window.history.replaceState({}, "", "/calendar");
    } else if (params.get("error")) {
      setError(params.get("error") || "OAuth failed");
      setMethod("api");
      setApiStatus("error");
      window.history.replaceState({}, "", "/calendar");
    }
  }, []);

  // Determine method on mount
  useEffect(() => {
    if (method !== "loading") return;
    (async () => {
      try {
        const res = await fetch("/api/calendar/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();

        if (data.method === "api" && data.connected) {
          setMethod("api");
          setApiStatus("connected");
        } else if (data.method === "api" && data.authUrl) {
          setMethod("api");
          setApiStatus("idle");
        } else {
          setMethod("browser-use");
        }
      } catch {
        setMethod("browser-use");
      }
    })();
  }, [method]);

  // Load calendars when connected via API
  useEffect(() => {
    if (method === "api" && apiStatus === "connected") {
      fetchCalendars();
    }
  }, [method, apiStatus, fetchCalendars]);

  const handleOAuthConnect = async () => {
    try {
      const res = await fetch("/api/calendar/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else if (data.connected) {
        setApiStatus("connected");
      }
    } catch {
      setError("Failed to start Google authorization");
      setApiStatus("error");
    }
  };

  const handleApiExport = async () => {
    setApiStatus("exporting");
    setError("");
    try {
      const res = await fetch("/api/calendar/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId: selectedCalendarId,
          includeTravelEvents: includeTravelEvents && !!exportHomeBase,
          homeBase: exportHomeBase,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");

      setApiResult({ eventsCreated: data.eventsCreated, errors: data.errors || [] });
      setApiStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
      setApiStatus("error");
    }
  };

  const handleDisconnect = async () => {
    await fetch("/api/calendar/connect", { method: "DELETE" });
    setMethod("loading");
    setApiStatus("idle");
    setApiResult(null);
    setCalendars([]);
    setSelectedCalendarId("primary");
    setError("");
  };

  // ── Shared class preview ──
  const classPreview = (
    <div className="space-y-2">
      {enabledClasses.map((cls) => (
        <div
          key={cls.id}
          className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3"
        >
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {cls.code}: {cls.name}
            </p>
            <p className="text-sm text-gray-500">
              {cls.schedule
                .map((s) => `${DAY_NAMES[s.dayOfWeek]} ${s.startTime}-${s.endTime}`)
                .join(", ") || "No schedule data"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  // ── Calendar picker ──
  const calendarPicker = calendars.length > 0 && (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Add events to calendar:
      </label>
      <select
        value={selectedCalendarId}
        onChange={(e) => setSelectedCalendarId(e.target.value)}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {calendars.map((cal) => (
          <option key={cal.id} value={cal.id}>
            {cal.summary}{cal.primary ? " (primary)" : ""}
          </option>
        ))}
      </select>
    </div>
  );

  // ── Loading ──
  if (method === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Export to Google Calendar
        </h2>
        <Card className="flex flex-col items-center py-12 space-y-4">
          <div className="h-10 w-10 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Checking calendar connection...</p>
        </Card>
      </div>
    );
  }

  // ══════════════════════════════════════════
  //  Google Calendar API flow
  // ══════════════════════════════════════════
  if (method === "api") {
    // Idle — not yet connected
    if (apiStatus === "idle") {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Export to Google Calendar
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Connect your Google account to export your class schedule.
            </p>
          </div>
          {enabledClasses.length === 0 ? (
            <Card className="py-8 text-center space-y-2 border-dashed">
              <p className="text-gray-500">No classes enabled for export.</p>
              <p className="text-sm text-gray-400">
                Go to the dashboard and toggle on the classes you want to export.
              </p>
            </Card>
          ) : (
            <>
              {classPreview}
              <Button onClick={handleOAuthConnect} size="lg">
                Sign in with Google
              </Button>
            </>
          )}
        </div>
      );
    }

    // Connected — choose calendar + export
    if (apiStatus === "connected") {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Export to Google Calendar
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Your Google account is connected. Choose a calendar and export.
            </p>
          </div>
          {enabledClasses.length === 0 ? (
            <Card className="py-8 text-center space-y-2 border-dashed">
              <p className="text-gray-500">No classes enabled for export.</p>
              <p className="text-sm text-gray-400">
                Go to the dashboard and toggle on the classes you want to export.
              </p>
            </Card>
          ) : (
            <>
              {classPreview}

              {loadingCalendars ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  Loading calendars...
                </div>
              ) : (
                calendarPicker
              )}

              {/* Travel buffer options */}
              <Card className="space-y-3 p-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTravelEvents}
                    onChange={(e) => setIncludeTravelEvents(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Include walking time buffer events
                </label>
                {includeTravelEvents && (
                  <div className="ml-6 space-y-1">
                    <label className="block text-xs text-gray-500 dark:text-gray-400">
                      Walk from (home base):
                    </label>
                    <select
                      value={exportHomeBase ?? ""}
                      onChange={(e) => setTravelHomeBase(e.target.value || null)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select your residence...</option>
                      {ALL_RESIDENCES.map((r) => (
                        <option key={r} value={r}>{locationLabel(r)}</option>
                      ))}
                    </select>
                    {!exportHomeBase && (
                      <p className="text-xs text-amber-600">Select a residence to enable travel events, or set it in Settings.</p>
                    )}
                  </div>
                )}
              </Card>

              <div className="flex gap-3">
                <Button
                  onClick={handleApiExport}
                  size="lg"
                  disabled={loadingCalendars}
                >
                  Export {enabledClasses.length} Class{enabledClasses.length === 1 ? "" : "es"}
                </Button>
                <Button variant="ghost" onClick={handleDisconnect}>
                  Disconnect Google
                </Button>
              </div>
            </>
          )}
        </div>
      );
    }

    // Exporting
    if (apiStatus === "exporting") {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Creating Calendar Events...
          </h2>
          <Card className="flex flex-col items-center py-12 space-y-4">
            <div className="h-10 w-10 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-gray-500 dark:text-gray-400">
              Adding {enabledClasses.length} class{enabledClasses.length === 1 ? "" : "es"} to Google Calendar...
            </p>
          </Card>
        </div>
      );
    }

    // Done
    if (apiStatus === "done" && apiResult) {
      return (
        <div className="space-y-6">
          <Card className="py-8 text-center space-y-3 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">
              Export Complete!
            </h2>
            <p className="text-green-600 dark:text-green-500">
              {apiResult.eventsCreated} event{apiResult.eventsCreated === 1 ? "" : "s"} created in Google Calendar.
            </p>
          </Card>
          {apiResult.errors.length > 0 && (
            <Card className="space-y-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Some events had issues:
              </p>
              <ul className="text-sm text-amber-600 dark:text-amber-500 list-disc list-inside">
                {apiResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </Card>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={() => (window.location.href = "/dashboard")}>
              Back to Dashboard
            </Button>
            <Button variant="ghost" onClick={() => { setApiStatus("connected"); setApiResult(null); }}>
              Export Again
            </Button>
          </div>
        </div>
      );
    }

    // Error
    if (apiStatus === "error") {
      return (
        <div className="space-y-6">
          <Card className="py-8 text-center space-y-3 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">
              Export Failed
            </h2>
            <p className="text-red-600 dark:text-red-500 text-sm">
              {error || "Something went wrong."}
            </p>
          </Card>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { setApiStatus("idle"); setError(""); }}>
              Try Again
            </Button>
            <Button variant="ghost" onClick={handleDisconnect}>
              Disconnect &amp; Reconnect
            </Button>
          </div>
        </div>
      );
    }
  }

  // ══════════════════════════════════════════
  //  Browser Use fallback
  // ══════════════════════════════════════════
  const handleConnect = async () => {
    try { await session.connect(); } catch { /* shown in state */ }
  };

  const handleExport = async () => {
    try { await session.confirmLogin(); } catch { /* shown in state */ }
  };

  if (session.status === "idle" || session.status === "loading") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Export to Google Calendar
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Google API not configured — using browser automation fallback.
          </p>
        </div>
        {enabledClasses.length === 0 ? (
          <Card className="py-8 text-center space-y-2 border-dashed">
            <p className="text-gray-500">No classes enabled for export.</p>
          </Card>
        ) : (
          <>
            {classPreview}
            <Button onClick={handleConnect} size="lg" disabled={session.status === "loading"}>
              Connect Google Calendar
            </Button>
          </>
        )}
      </div>
    );
  }

  if (session.status === "connecting") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Connecting to Google Calendar...
        </h2>
        <Card className="flex flex-col items-center py-12 space-y-4">
          <div className="h-10 w-10 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">
            {session.progressMessage || "Setting things up..."}
          </p>
        </Card>
      </div>
    );
  }

  if (session.status === "awaiting_login") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sign into Google</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Sign into your Google account below, then click <strong>&quot;Start Export&quot;</strong>.
          </p>
        </div>
        {session.liveUrl ? (
          <>
            <BrowserFrame src={session.liveUrl} title="Google Calendar" />
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Iframe not loading?</strong>{" "}
                <a href={session.liveUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  Open in a new tab
                </a>
              </p>
            </div>
          </>
        ) : (
          <Card className="py-8 text-center space-y-3">
            <p className="text-gray-500">Waiting for browser session...</p>
            <div className="h-6 w-6 mx-auto rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          </Card>
        )}
        <div className="flex gap-3">
          <Button onClick={handleExport} size="lg">
            I&apos;m Signed In - Start Export
          </Button>
          <Button variant="ghost" onClick={() => window.location.reload()}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (session.status === "scraping") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Creating Calendar Events...
        </h2>
        {session.liveUrl && <BrowserFrame src={session.liveUrl} title="Exporting..." />}
        <Card className="flex items-center gap-4 py-4">
          <div className="h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0" />
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Creating recurring events for each class...
          </p>
        </Card>
      </div>
    );
  }

  if (session.status === "completed") {
    return (
      <div className="space-y-6">
        <Card className="py-8 text-center space-y-3 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">Export Complete!</h2>
          <p className="text-green-600 dark:text-green-500">Your classes have been added to Google Calendar.</p>
        </Card>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => (window.location.href = "/dashboard")}>Back to Dashboard</Button>
          <Button variant="ghost" onClick={() => window.location.reload()}>Export Again</Button>
        </div>
      </div>
    );
  }

  if (session.status === "failed") {
    return (
      <div className="space-y-6">
        <Card className="py-8 text-center space-y-3 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">Export Failed</h2>
          <p className="text-red-600 dark:text-red-500 text-sm">{session.error || "Something went wrong."}</p>
        </Card>
        <div className="flex justify-center">
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return null;
}
