"use client";

import { useState, useEffect } from "react";
import { CalendarLayout } from "@/components/calendar-view/CalendarLayout";
import { CalendarExport } from "@/components/calendar/CalendarExport";
import { useAuth } from "@/context/AuthContext";

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const [showExportPanel, setShowExportPanel] = useState(false);

  // Check URL params for OAuth callback (auto-open export panel)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true" || params.get("error")) {
      setShowExportPanel(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <CalendarLayout />

      {/* Export panel toggle button */}
      <button
        onClick={() => setShowExportPanel(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-white shadow-lg hover:bg-blue-700 transition-colors"
        style={{ display: showExportPanel ? "none" : "flex" }}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        Export to Google
      </button>

      {/* Slide-over export panel */}
      {showExportPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowExportPanel(false)}
          />
          {/* Panel */}
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4 z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Google Calendar Export
              </h2>
              <button
                onClick={() => setShowExportPanel(false)}
                className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <CalendarExport />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
