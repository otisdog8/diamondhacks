"use client";

import { Button } from "@/components/ui/Button";
import { BrowserFrame } from "@/components/canvas/BrowserFrame";
import { useBrowserSession } from "@/hooks/useBrowserSession";
import { useClasses } from "@/hooks/useClasses";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarExport() {
  const session = useBrowserSession("google");
  const { classes } = useClasses();
  const enabledClasses = classes.filter((c) => c.enabled);

  const handleConnect = async () => {
    await session.connect();
  };

  const handleExport = async () => {
    await session.confirmLogin();
  };

  // Preview before connecting
  if (session.status === "idle" || session.status === "none") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Export to Google Calendar
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            The following enabled classes will be added as recurring events to
            your Google Calendar.
          </p>
        </div>

        {enabledClasses.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
            <p className="text-gray-500">No classes enabled for export.</p>
            <p className="text-sm text-gray-400 mt-1">
              Go to the dashboard and toggle on the classes you want to export.
            </p>
          </div>
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
                        .map(
                          (s) =>
                            `${DAY_NAMES[s.dayOfWeek]} ${s.startTime}-${s.endTime}`
                        )
                        .join(", ")}
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

  // Login to Google
  if (session.status === "awaiting_login" && session.liveUrl) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Sign into Google
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Sign into your Google account in the browser below, then click
            &quot;Start Export&quot;.
          </p>
        </div>
        <BrowserFrame src={session.liveUrl} title="Google Calendar" />
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

  // Exporting
  if (session.status === "scraping") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Creating Calendar Events...
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Adding {enabledClasses.length} classes to your Google Calendar.
          </p>
        </div>
        {session.liveUrl && (
          <BrowserFrame src={session.liveUrl} title="Exporting..." />
        )}
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <span className="text-sm text-gray-500">Export in progress...</span>
        </div>
      </div>
    );
  }

  // Done
  if (session.status === "completed") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-6 text-center">
          <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">
            Export Complete!
          </h2>
          <p className="text-green-600 dark:text-green-500 mt-1">
            Your classes have been added to Google Calendar.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => (window.location.href = "/dashboard")}>
            Back to Dashboard
          </Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Export Again
          </Button>
        </div>
      </div>
    );
  }

  // Failed
  if (session.status === "failed") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">
            Export Failed
          </h2>
          <p className="text-red-600 dark:text-red-500 mt-1">
            {session.error || "Something went wrong."}
          </p>
        </div>
        <Button onClick={() => window.location.reload()} className="mx-auto block">
          Try Again
        </Button>
      </div>
    );
  }

  return null;
}
