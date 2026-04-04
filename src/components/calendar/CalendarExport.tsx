"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BrowserFrame } from "@/components/canvas/BrowserFrame";
import { useBrowserSession } from "@/hooks/useBrowserSession";
import { useClasses } from "@/hooks/useClasses";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarExport() {
  const session = useBrowserSession("google");
  const { classes } = useClasses();
  const enabledClasses = classes.filter((c) => c.enabled);

  const handleConnect = async () => {
    try {
      await session.connect();
    } catch {
      // error shown in state
    }
  };

  const handleExport = async () => {
    try {
      await session.confirmLogin();
    } catch {
      // error shown in state
    }
  };

  // ── Idle: preview + connect button ──
  if (session.status === "idle") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Export to Google Calendar
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            The following enabled classes will be added as recurring events to
            your Google Calendar.
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
            <Button onClick={handleConnect} size="lg">
              Connect Google Calendar
            </Button>
          </>
        )}
      </div>
    );
  }

  // ── Connecting ──
  if (session.status === "connecting") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Connecting to Google Calendar...
          </h2>
        </div>
        <Card className="flex flex-col items-center py-12 space-y-4">
          <div className="h-10 w-10 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">
            {session.progressMessage || "Setting things up..."}
          </p>
        </Card>
      </div>
    );
  }

  // ── Awaiting login ──
  if (session.status === "awaiting_login") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sign into Google
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Sign into your Google account in the browser below, then click
            <strong> &quot;Start Export&quot;</strong>.
          </p>
        </div>

        {session.liveUrl ? (
          <>
            <BrowserFrame src={session.liveUrl} title="Google Calendar" />
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Iframe not loading?</strong>{" "}
                <a
                  href={session.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  Open the browser in a new tab
                </a>{" "}
                and come back here when you&apos;re signed in.
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
          <Button variant="ghost" onClick={() => window.location.reload()}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ── Exporting ──
  if (session.status === "scraping") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Creating Calendar Events...
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Adding {enabledClasses.length} classes to your Google Calendar.
          </p>
        </div>
        {session.liveUrl && (
          <BrowserFrame src={session.liveUrl} title="Exporting..." />
        )}
        <Card className="flex items-center gap-4 py-4">
          <div className="h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0" />
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Creating recurring events for each class...
          </p>
        </Card>
      </div>
    );
  }

  // ── Completed ──
  if (session.status === "completed") {
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
            Your classes have been added to Google Calendar.
          </p>
        </Card>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => (window.location.href = "/dashboard")}>
            Back to Dashboard
          </Button>
          <Button variant="ghost" onClick={() => window.location.reload()}>
            Export Again
          </Button>
        </div>
      </div>
    );
  }

  // ── Failed ──
  if (session.status === "failed") {
    return (
      <div className="space-y-6">
        <Card className="py-8 text-center space-y-3 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">
            Export Failed
          </h2>
          <p className="text-red-600 dark:text-red-500 text-sm">
            {session.error || "Something went wrong."}
          </p>
        </Card>
        <div className="flex justify-center">
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
