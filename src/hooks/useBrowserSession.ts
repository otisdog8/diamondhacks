"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface SessionState {
  scrapeSessionId: string | null;
  liveUrl: string | null;
  status: "idle" | "awaiting_login" | "scraping" | "completed" | "failed" | "none";
  classesFound?: number;
  error?: string;
}

export function useBrowserSession(service: "canvas" | "google") {
  const [state, setState] = useState<SessionState>({
    scrapeSessionId: null,
    liveUrl: null,
    status: "idle",
  });
  const [polling, setPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPolling(false);
  }, []);

  const pollStatus = useCallback(
    async (sessionId: string) => {
      try {
        const endpoint =
          service === "canvas"
            ? `/api/canvas/status?sessionId=${sessionId}`
            : `/api/canvas/status?sessionId=${sessionId}`;

        const res = await fetch(endpoint);
        if (!res.ok) return;
        const data = await res.json();

        setState((prev) => ({
          ...prev,
          status: data.status,
          classesFound: data.classesFound,
          error: data.error,
        }));

        if (data.status === "completed" || data.status === "failed") {
          stopPolling();
        }
      } catch {
        // Ignore polling errors
      }
    },
    [service, stopPolling]
  );

  const startPolling = useCallback(
    (sessionId: string) => {
      setPolling(true);
      intervalRef.current = setInterval(() => pollStatus(sessionId), 3000);
    },
    [pollStatus]
  );

  const connect = useCallback(
    async (options?: { canvasUrl?: string }) => {
      try {
        const endpoint =
          service === "canvas" ? "/api/canvas/connect" : "/api/calendar/connect";

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options || {}),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Connection failed");
        }

        const data = await res.json();
        setState({
          scrapeSessionId: data.scrapeSessionId,
          liveUrl: data.liveUrl,
          status: "awaiting_login",
        });

        return data;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: "failed",
          error: err instanceof Error ? err.message : "Connection failed",
        }));
        throw err;
      }
    },
    [service]
  );

  const confirmLogin = useCallback(
    async (canvasUrl?: string) => {
      if (!state.scrapeSessionId) throw new Error("No active session");

      const endpoint =
        service === "canvas" ? "/api/canvas/status" : "/api/calendar/export";

      const body: Record<string, string> = {
        scrapeSessionId: state.scrapeSessionId,
      };
      if (canvasUrl) body.canvasUrl = canvasUrl;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start");
      }

      setState((prev) => ({ ...prev, status: "scraping" }));
      startPolling(state.scrapeSessionId);
    },
    [state.scrapeSessionId, service, startPolling]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    ...state,
    polling,
    connect,
    confirmLogin,
    stopPolling,
  };
}
