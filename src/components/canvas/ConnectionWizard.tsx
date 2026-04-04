"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BrowserFrame } from "./BrowserFrame";
import { useBrowserSession } from "@/hooks/useBrowserSession";

export function ConnectionWizard() {
  const [canvasUrl, setCanvasUrl] = useState("https://canvas.ucsd.edu");
  const session = useBrowserSession("canvas");

  const handleConnect = async () => {
    await session.connect({ canvasUrl });
  };

  const handleConfirmLogin = async () => {
    await session.confirmLogin(canvasUrl);
  };

  // Step 1: Enter Canvas URL and connect
  if (session.status === "idle" || session.status === "none") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Connect to Canvas
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            We&apos;ll open your Canvas in a browser window. You&apos;ll log in manually,
            then we&apos;ll automatically import your class schedule.
          </p>
        </div>
        <Input
          label="Canvas URL"
          value={canvasUrl}
          onChange={(e) => setCanvasUrl(e.target.value)}
          placeholder="https://canvas.ucsd.edu"
        />
        <Button onClick={handleConnect} size="lg">
          Start Connection
        </Button>
      </div>
    );
  }

  // Step 2: Show browser frame for login
  if (session.status === "awaiting_login" && session.liveUrl) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Log into Canvas
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Log into your Canvas account in the browser window below. Once you&apos;re
            logged in and can see your dashboard, click the button below.
          </p>
        </div>
        <BrowserFrame src={session.liveUrl} title="Canvas Login" />
        <div className="flex gap-3">
          <Button onClick={handleConfirmLogin} size="lg">
            I&apos;m Logged In - Start Import
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.location.reload()}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Scraping in progress
  if (session.status === "scraping") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Importing Classes...
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            We&apos;re navigating through your Canvas courses and extracting schedule
            information. This may take a few minutes.
          </p>
        </div>
        {session.liveUrl && (
          <BrowserFrame src={session.liveUrl} title="Importing..." />
        )}
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <span className="text-sm text-gray-500">Scraping in progress...</span>
        </div>
      </div>
    );
  }

  // Step 4: Completed
  if (session.status === "completed") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-6 text-center">
          <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">
            Import Complete!
          </h2>
          <p className="text-green-600 dark:text-green-500 mt-1">
            {session.classesFound
              ? `Found ${session.classesFound} classes.`
              : "Your classes have been imported."}
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => (window.location.href = "/dashboard")}>
            View Classes
          </Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Import Again
          </Button>
        </div>
      </div>
    );
  }

  // Failed state
  if (session.status === "failed") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">
            Import Failed
          </h2>
          <p className="text-red-600 dark:text-red-500 mt-1">
            {session.error || "Something went wrong. Please try again."}
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
