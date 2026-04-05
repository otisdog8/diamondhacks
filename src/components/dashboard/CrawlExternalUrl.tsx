"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { BrowserFrame } from "@/components/canvas/BrowserFrame";

type CrawlStatus = "idle" | "crawling" | "review" | "needs_login" | "done" | "error";

interface CrawlState {
  status: CrawlStatus;
  scrapeSessionId: string | null;
  liveUrl: string | null;
  stepCount: number;
  lastStepSummary: string;
  classesFound: number;
  rawOutput: string;
  error: string;
}

export function CrawlExternalUrl() {
  const [url, setUrl] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<CrawlState>({
    status: "idle",
    scrapeSessionId: null,
    liveUrl: null,
    stepCount: 0,
    lastStepSummary: "",
    classesFound: 0,
    rawOutput: "",
    error: "",
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const poll = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/canvas/status?sessionId=${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();

      let status: CrawlStatus = "crawling";
      if (data.status === "review") status = "review";
      else if (data.status === "completed") status = "done";
      else if (data.status === "failed") status = "error";
      else if (data.status === "needs_login") status = "needs_login";
      else if (data.status === "scraping") status = "crawling";

      setState((prev) => ({
        ...prev,
        status,
        liveUrl: data.liveUrl || prev.liveUrl,
        stepCount: data.stepCount ?? prev.stepCount,
        lastStepSummary: data.lastStepSummary ?? prev.lastStepSummary,
        classesFound: data.classesFound ?? prev.classesFound,
        rawOutput: data.rawOutput ?? prev.rawOutput,
        error: data.error ?? "",
      }));

      if (status === "review" || status === "done" || status === "error") {
        stopPolling();
      }
    } catch { /* ignore */ }
  }, [stopPolling]);

  const startPolling = useCallback((sessionId: string) => {
    stopPolling();
    poll(sessionId);
    intervalRef.current = setInterval(() => poll(sessionId), 3000);
  }, [poll, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleCrawl = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setState((prev) => ({
      ...prev,
      status: "crawling",
      lastStepSummary: `Starting crawl of ${new URL(trimmed).hostname}...`,
      stepCount: 0,
      classesFound: 0,
      rawOutput: "",
      error: "",
    }));

    try {
      const res = await fetch("/api/canvas/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "crawl", externalUrl: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start crawl");
      }

      const data = await res.json();
      setState((prev) => ({
        ...prev,
        scrapeSessionId: data.scrapeSessionId,
        liveUrl: data.liveUrl,
      }));
      startPolling(data.scrapeSessionId);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err instanceof Error ? err.message : "Crawl failed",
      }));
    }
  };

  const handleConfirm = async () => {
    if (!state.scrapeSessionId) return;
    await fetch("/api/canvas/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scrapeSessionId: state.scrapeSessionId, action: "confirm" }),
    });
    setState((prev) => ({ ...prev, status: "done" }));
  };

  const handleResume = async () => {
    if (!state.scrapeSessionId) return;
    setState((prev) => ({ ...prev, status: "crawling", lastStepSummary: "Resuming..." }));
    await fetch("/api/canvas/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scrapeSessionId: state.scrapeSessionId, action: "resume" }),
    });
    startPolling(state.scrapeSessionId);
  };

  const [discarding, setDiscarding] = useState(false);

  const handleDiscard = async () => {
    setDiscarding(true);
    try {
      stopPolling();
      await fetch("/api/canvas/connect", { method: "DELETE" });
      setState({
        status: "idle", scrapeSessionId: null, liveUrl: null,
        stepCount: 0, lastStepSummary: "", classesFound: 0, rawOutput: "", error: "",
      });
      setUrl("");
      setExpanded(false);
    } finally {
      setDiscarding(false);
    }
  };

  // ── Crawling ──
  if (state.status === "crawling") {
    return (
      <Card className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              {state.lastStepSummary || "Crawling..."}
            </p>
            {state.stepCount > 0 && (
              <p className="text-xs text-gray-400">Step {state.stepCount}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={discarding}>
            {discarding ? <><span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin mr-1.5" />Cancelling...</> : "Cancel"}
          </Button>
        </div>
        {state.liveUrl && (
          <details>
            <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
              View browser
            </summary>
            <div className="mt-2">
              <BrowserFrame src={state.liveUrl} title="Crawling..." />
            </div>
          </details>
        )}
      </Card>
    );
  }

  // ── Needs login ──
  if (state.status === "needs_login") {
    return (
      <Card className="space-y-3 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
        <p className="text-sm text-amber-700 dark:text-amber-400">
          <strong>Login required:</strong> {state.lastStepSummary || "The agent hit a login page."}
        </p>
        {state.liveUrl && (
          <BrowserFrame src={state.liveUrl} title="Login needed" />
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleResume}>I&apos;ve Logged In — Continue</Button>
          <Button size="sm" variant="ghost" onClick={handleDiscard} disabled={discarding}>
            {discarding ? <><span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin mr-1.5" />Cancelling...</> : "Cancel"}
          </Button>
        </div>
      </Card>
    );
  }

  // ── Review ──
  if (state.status === "review") {
    return (
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Crawl finished — <span className="font-medium">{state.classesFound} course{state.classesFound === 1 ? "" : "s"}</span> found
          </p>
          <div className="flex gap-2">
            {state.classesFound > 0 && (
              <Button size="sm" onClick={handleConfirm}>Save Results</Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleDiscard} disabled={discarding}>
              {discarding ? <><span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin mr-1.5" />Discarding...</> : "Discard"}
            </Button>
          </div>
        </div>
        {state.rawOutput && (
          <details>
            <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
              View agent output
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
              {state.rawOutput}
            </pre>
          </details>
        )}
      </Card>
    );
  }

  // ── Done ──
  if (state.status === "done") {
    return (
      <Card className="flex items-center justify-between border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
        <p className="text-sm text-green-700 dark:text-green-400">
          Crawl saved — {state.classesFound} course{state.classesFound === 1 ? "" : "s"} imported
        </p>
        <Button size="sm" variant="ghost" onClick={() => {
          setState((prev) => ({ ...prev, status: "idle" }));
          setUrl("");
        }}>
          Crawl Another
        </Button>
      </Card>
    );
  }

  // ── Error ──
  if (state.status === "error") {
    return (
      <Card className="flex items-center justify-between border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
        <p className="text-sm text-red-600 dark:text-red-400">
          Crawl failed: {state.error || "Unknown error"}
        </p>
        <Button size="sm" variant="ghost" onClick={() => setState((prev) => ({ ...prev, status: "idle" }))}>
          Try Again
        </Button>
      </Card>
    );
  }

  // ── Idle ──
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        Crawl an external class website
      </button>
    );
  }

  return (
    <Card className="space-y-3">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Crawl an external class website for schedule info
      </p>
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://piazza.com/class/... or any class site"
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleCrawl()}
        />
        <Button size="sm" disabled={!url.trim()} onClick={handleCrawl}>
          Crawl
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
