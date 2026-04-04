"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type SessionStatus =
  | "idle"
  | "loading"
  | "connecting"
  | "awaiting_login"
  | "scraping"
  | "needs_login"
  | "review"
  | "completed"
  | "failed";

interface SessionState {
  scrapeSessionId: string | null;
  liveUrl: string | null;
  status: SessionStatus;
  classesFound?: number;
  stepCount?: number;
  lastStepSummary?: string;
  rawOutput?: string;
  error?: string;
  progressMessage: string;
  reused: boolean;
}

export function useBrowserSession(service: "canvas" | "google") {
  const [state, setState] = useState<SessionState>({
    scrapeSessionId: null,
    liveUrl: null,
    status: "loading",
    progressMessage: "",
    reused: false,
  });
  const [polling, setPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkedRef = useRef(false);

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
        const res = await fetch(`/api/canvas/status?sessionId=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();

        setState((prev) => ({
          ...prev,
          status: data.status,
          liveUrl: data.liveUrl || prev.liveUrl,
          classesFound: data.classesFound,
          stepCount: data.stepCount,
          lastStepSummary: data.lastStepSummary,
          rawOutput: data.rawOutput || prev.rawOutput,
          error: data.error,
        }));

        if (data.status === "completed" || data.status === "failed" || data.status === "review") {
          stopPolling();
        }
        // Don't stop polling on needs_login — keep polling so we pick up resume
      } catch {
        // Ignore polling errors
      }
    },
    [stopPolling]
  );

  const startPolling = useCallback(
    (sessionId: string) => {
      if (polling) return; // don't double-poll
      setPolling(true);
      // Poll immediately, then every 3s
      pollStatus(sessionId);
      intervalRef.current = setInterval(() => pollStatus(sessionId), 3000);
    },
    [pollStatus, polling]
  );

  // On mount, check for existing active session
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/canvas/status`);
        if (!res.ok) {
          setState((prev) => ({ ...prev, status: "idle" }));
          return;
        }
        const data = await res.json();

        if (data.status === "none" || !data.id) {
          setState((prev) => ({ ...prev, status: "idle" }));
          return;
        }

        setState({
          scrapeSessionId: data.id,
          liveUrl: data.liveUrl || null,
          status: data.status,
          classesFound: data.classesFound,
          stepCount: data.stepCount,
          lastStepSummary: data.lastStepSummary,
          error: data.error,
          progressMessage: "",
          reused: true,
        });

        // If actively working, start polling
        if (data.status === "scraping" || data.status === "needs_login") {
          // Delay slightly to avoid double-start with startPolling dep
          setTimeout(() => {
            setPolling(true);
          }, 0);
        }
      } catch {
        setState((prev) => ({ ...prev, status: "idle" }));
      }
    })();
  }, []);

  // Start interval when polling flag goes true
  useEffect(() => {
    if (polling && state.scrapeSessionId && !intervalRef.current) {
      intervalRef.current = setInterval(() => pollStatus(state.scrapeSessionId!), 3000);
    }
    return () => {
      if (!polling && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [polling, state.scrapeSessionId, pollStatus]);

  const connect = useCallback(
    async (options?: { canvasUrl?: string }) => {
      setState((prev) => ({
        ...prev,
        status: "connecting",
        progressMessage: "Creating secure browser session...",
        error: undefined,
        reused: false,
      }));

      try {
        const endpoint =
          service === "canvas" ? "/api/canvas/connect" : "/api/calendar/connect";

        const progressTimer = setTimeout(() => {
          setState((prev) => ({
            ...prev,
            progressMessage: "Navigating to " + (service === "canvas" ? "Canvas" : "Google Calendar") + "...",
          }));
        }, 2000);

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options || {}),
        });

        clearTimeout(progressTimer);

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Connection failed");
        }

        const data = await res.json();

        // If the server found an existing session, use its actual status.
        // For new sessions, stay in "connecting" — the nav agent is still
        // working. Polling will pick up the transition to "awaiting_login".
        const initialStatus = data.reused ? (data.status || "awaiting_login") : "connecting";

        setState({
          scrapeSessionId: data.scrapeSessionId,
          liveUrl: data.liveUrl,
          status: initialStatus as SessionStatus,
          progressMessage: initialStatus === "connecting" ? "Navigating to Canvas..." : "",
          reused: data.reused || false,
        });

        // Start polling so we pick up the connecting → awaiting_login transition
        if (initialStatus === "connecting") {
          setPolling(true);
        }

        return data;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: "failed",
          error: err instanceof Error ? err.message : "Connection failed",
          progressMessage: "",
        }));
        throw err;
      }
    },
    [service]
  );

  const confirmLogin = useCallback(
    async (canvasUrl?: string) => {
      if (!state.scrapeSessionId) throw new Error("No active session");

      setState((prev) => ({
        ...prev,
        status: "scraping",
        progressMessage: "Starting class import...",
        stepCount: 0,
        lastStepSummary: undefined,
      }));

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

      startPolling(state.scrapeSessionId);
    },
    [state.scrapeSessionId, service, startPolling]
  );

  // Resume after user logs in on an external site
  const resume = useCallback(
    async (canvasUrl?: string) => {
      if (!state.scrapeSessionId) throw new Error("No active session");

      setState((prev) => ({
        ...prev,
        status: "scraping",
        lastStepSummary: "Resuming...",
      }));

      const res = await fetch("/api/canvas/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scrapeSessionId: state.scrapeSessionId,
          canvasUrl,
          action: "resume",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resume");
      }

      if (!polling) startPolling(state.scrapeSessionId);
    },
    [state.scrapeSessionId, polling, startPolling]
  );

  // Confirm review results — finalize and stop session
  const confirm = useCallback(async () => {
    if (!state.scrapeSessionId) return;

    const res = await fetch("/api/canvas/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scrapeSessionId: state.scrapeSessionId,
        action: "confirm",
      }),
    });

    if (res.ok) {
      setState((prev) => ({ ...prev, status: "completed" }));
    }
  }, [state.scrapeSessionId]);

  // Search harder — re-scrape with a deeper prompt
  const searchDeeper = useCallback(async (canvasUrl?: string) => {
    if (!state.scrapeSessionId) return;

    setState((prev) => ({
      ...prev,
      status: "scraping",
      lastStepSummary: "Searching harder...",
      stepCount: 0,
    }));

    const res = await fetch("/api/canvas/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scrapeSessionId: state.scrapeSessionId,
        canvasUrl,
        action: "deeper",
      }),
    });

    if (res.ok) {
      startPolling(state.scrapeSessionId);
    }
  }, [state.scrapeSessionId, startPolling]);

  // Crawl an external URL for class info
  const crawlUrl = useCallback(async (externalUrl: string) => {
    if (!state.scrapeSessionId) return;

    setState((prev) => ({
      ...prev,
      status: "scraping",
      lastStepSummary: `Crawling ${new URL(externalUrl).hostname}...`,
      stepCount: 0,
    }));

    const res = await fetch("/api/canvas/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scrapeSessionId: state.scrapeSessionId,
        action: "crawl",
        externalUrl,
      }),
    });

    if (res.ok) {
      startPolling(state.scrapeSessionId);
    }
  }, [state.scrapeSessionId, startPolling]);

  const discard = useCallback(async () => {
    stopPolling();
    try {
      const endpoint =
        service === "canvas" ? "/api/canvas/connect" : "/api/calendar/connect";
      await fetch(endpoint, { method: "DELETE" });
    } catch {
      // best effort
    }
    setState({
      scrapeSessionId: null,
      liveUrl: null,
      status: "idle",
      progressMessage: "",
      reused: false,
    });
  }, [service, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    polling,
    connect,
    confirmLogin,
    resume,
    confirm,
    searchDeeper,
    crawlUrl,
    discard,
    stopPolling,
  };
}
