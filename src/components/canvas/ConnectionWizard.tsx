"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { BrowserFrame } from "./BrowserFrame";
import { useBrowserSession } from "@/hooks/useBrowserSession";

function BackButton() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-1.5 text-sm text-[#8F8F8F] hover:text-[#464646] dark:hover:text-[#C8C8C8] transition-colors mb-4"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
      </svg>
      Back to Dashboard
    </Link>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin ${className}`}
    />
  );
}

export function ConnectionWizard() {
  const [canvasUrl, setCanvasUrl] = useState("https://canvas.ucsd.edu");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");
  const [showCrawlInput, setShowCrawlInput] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const session = useBrowserSession("canvas");

  const handleDiscard = async () => {
    setDiscarding(true);
    try { await session.discard(); } finally { setDiscarding(false); }
  };

  const handleConnect = async () => {
    try { await session.connect({ canvasUrl }); } catch { /* hook handles error */ }
  };

  const handleConfirmLogin = async () => {
    try { await session.confirmLogin(canvasUrl); } catch { /* hook handles error */ }
  };

  const handleResume = async () => {
    try { await session.resume(canvasUrl); } catch { /* hook handles error */ }
  };

  // ── Loading ──
  if (session.status === "loading") {
    return (
      <Card className="flex flex-col items-center py-12 space-y-3">
        <Spinner className="h-6 w-6 text-blue-500" />
        <p className="text-sm text-[#8F8F8F]">Checking for existing session...</p>
      </Card>
    );
  }

  // ── Idle ──
  if (session.status === "idle") {
    return (
      <div className="space-y-6">
        <BackButton />
        <div>
          <h2 className="text-2xl font-bold text-[#000000] dark:text-[#F5F6F8]">
            Import from Canvas
          </h2>
          <p className="text-[#8F8F8F] dark:text-[#8F8F8F] mt-1.5 text-sm leading-relaxed">
            Opens a secure cloud browser where you log into Canvas. Then our AI
            scrapes your full class schedule.
          </p>
        </div>

        {showUrlInput ? (
          <div className="space-y-3">
            <Input
              label="Canvas URL"
              value={canvasUrl}
              onChange={(e) => setCanvasUrl(e.target.value)}
              placeholder="https://canvas.ucsd.edu"
            />
            <div className="flex gap-3">
              <Button onClick={handleConnect} size="lg">Connect Canvas</Button>
              <Button variant="ghost" onClick={() => setShowUrlInput(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleConnect} size="lg">Connect Canvas</Button>
            <button
              onClick={() => setShowUrlInput(true)}
              className="text-sm text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              Different Canvas URL?
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Connecting ──
  if (session.status === "connecting") {
    return (
      <div className="space-y-6">
        <BackButton />
        <h2 className="text-2xl font-bold text-[#000000] dark:text-[#F5F6F8]">
          Connecting to Canvas...
        </h2>
        <Card className="space-y-4 py-6">
          <div className="flex items-center gap-4">
            <Spinner className="h-7 w-7 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#464646] dark:text-[#C8C8C8]">
                {session.lastStepSummary || session.progressMessage || "Setting things up..."}
              </p>
              {(session.stepCount ?? 0) > 0 && (
                <p className="text-xs text-[#8F8F8F] mt-0.5">Step {session.stepCount}</p>
              )}
            </div>
          </div>
          <div className="w-full bg-[#F0F1F5] dark:bg-[#22263A] rounded-full h-1">
            <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: "40%" }} />
          </div>
          <p className="text-xs text-[#8F8F8F] text-center">
            The AI agent is navigating to Canvas. A login screen will appear shortly.
          </p>
        </Card>
        <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={discarding}>
          {discarding ? <><Spinner className="h-3 w-3 mr-1.5" />Cancelling...</> : "Cancel"}
        </Button>
      </div>
    );
  }

  // ── Awaiting login ──
  if (session.status === "awaiting_login") {
    return (
      <div className="space-y-6">
        <BackButton />
        <div>
          <h2 className="text-2xl font-bold text-[#000000] dark:text-[#F5F6F8]">
            Log into Canvas
          </h2>
          <p className="text-[#8F8F8F] dark:text-[#8F8F8F] mt-1.5 text-sm">
            {session.reused
              ? "You have an existing browser session. Log in below if needed, then click the button."
              : "Log into your Canvas account below, then click the button."}
          </p>
        </div>

        <IframeOrFallback liveUrl={session.liveUrl} title="Canvas Login" />

        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleConfirmLogin} size="lg">
            I&apos;m Logged In — Start Import
          </Button>
          <Button variant="danger" size="sm" onClick={handleDiscard} disabled={discarding}>
            {discarding ? <><Spinner className="h-3 w-3 mr-1.5" />Discarding...</> : "Discard Session"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Scraping ──
  if (session.status === "scraping") {
    return (
      <div className="space-y-6">
        <BackButton />
        <h2 className="text-2xl font-bold text-[#000000] dark:text-[#F5F6F8]">
          Importing Classes...
        </h2>

        <IframeOrFallback liveUrl={session.liveUrl} title="Importing classes..." />

        <Card className="space-y-3 py-4">
          <div className="flex items-center gap-4">
            <Spinner className="h-5 w-5 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#464646] dark:text-[#C8C8C8] truncate">
                {session.lastStepSummary || session.progressMessage || "Scraping in progress..."}
              </p>
              {(session.stepCount ?? 0) > 0 && (
                <p className="text-xs text-[#8F8F8F] mt-0.5">
                  Step {session.stepCount} completed
                </p>
              )}
            </div>
          </div>
          <div className="w-full bg-[#F0F1F5] dark:bg-[#22263A] rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(((session.stepCount ?? 0) / 30) * 100, 95)}%` }}
            />
          </div>
          <p className="text-xs text-[#8F8F8F]">
            Following links, extracting schedules, over-documenting everything
          </p>
        </Card>
      </div>
    );
  }

  // ── Needs login ──
  if (session.status === "needs_login") {
    return (
      <div className="space-y-6">
        <BackButton />
        <div>
          <h2 className="text-2xl font-bold text-[#000000] dark:text-[#F5F6F8]">
            Login Required
          </h2>
          <p className="text-[#8F8F8F] dark:text-[#8F8F8F] mt-1.5 text-sm">
            The AI agent hit a login page on an external site (Piazza, Gradescope, etc.)
            and needs you to log in. Use the browser below, then click &quot;Continue Import&quot;.
          </p>
        </div>

        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Agent paused:</strong>{" "}
            {session.lastStepSummary || "Encountered a login page"}
          </p>
          {(session.stepCount ?? 0) > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              {session.stepCount} steps completed before stopping
            </p>
          )}
        </div>

        <IframeOrFallback liveUrl={session.liveUrl} title="External Login" />

        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleResume} size="lg">
            I&apos;ve Logged In — Continue Import
          </Button>
          <Button variant="secondary" size="sm" onClick={handleConfirmLogin}>
            Skip External Sites
          </Button>
          <Button variant="danger" size="sm" onClick={handleDiscard} disabled={discarding}>
            {discarding ? <><Spinner className="h-3 w-3 mr-1.5" />Cancelling...</> : "Cancel"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Review ──
  if (session.status === "review") {
    const hasResults = (session.classesFound ?? 0) > 0;
    return (
      <div className="space-y-6">
        <BackButton />
        <div>
          <h2 className="text-2xl font-bold text-[#000000] dark:text-[#F5F6F8]">
            Review Scrape Results
          </h2>
          <p className="text-[#8F8F8F] dark:text-[#8F8F8F] mt-1.5 text-sm">
            The AI agent finished scraping. Review the results below before saving.
            The browser session is still alive — you can ask it to search harder.
          </p>
        </div>

        <Card
          className={`py-6 space-y-3 ${
            hasResults
              ? "!border-green-200 dark:!border-green-800 !bg-green-50 dark:!bg-green-900/10"
              : "!border-amber-200 dark:!border-amber-800 !bg-amber-50 dark:!bg-amber-900/10"
          }`}
        >
          <div className="flex items-center gap-3">
            {hasResults ? (
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
            )}
            <div>
              <p className="font-medium text-[#000000] dark:text-[#F5F6F8]">
                {hasResults
                  ? `Found ${session.classesFound} course${session.classesFound === 1 ? "" : "s"}`
                  : "No structured course data found"}
              </p>
              {session.lastStepSummary && (
                <p className="text-sm text-[#8F8F8F] mt-0.5">{session.lastStepSummary}</p>
              )}
            </div>
          </div>
        </Card>

        {session.rawOutput && (
          <details className="group">
            <summary className="cursor-pointer text-sm text-[#8F8F8F] hover:text-[#464646] dark:hover:text-[#C8C8C8] transition-colors">
              View agent output
            </summary>
            <pre className="mt-2 p-4 bg-[#F0F1F5] dark:bg-[#22263A] rounded-lg text-xs text-[#464646] dark:text-[#C8C8C8] overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
              {session.rawOutput}
            </pre>
          </details>
        )}

        {session.liveUrl && (
          <details className="group">
            <summary className="cursor-pointer text-sm text-[#8F8F8F] hover:text-[#464646] dark:hover:text-[#C8C8C8] transition-colors">
              View live browser (session still active)
            </summary>
            <div className="mt-2">
              <BrowserFrame src={session.liveUrl} title="Canvas (review)" />
            </div>
          </details>
        )}

        {showCrawlInput ? (
          <Card className="space-y-3">
            <p className="text-sm font-medium text-[#464646] dark:text-[#C8C8C8]">
              Enter the URL of an external class site to crawl
            </p>
            <Input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://piazza.com/class/... or any class website"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!externalUrl.trim()}
                onClick={() => {
                  session.crawlUrl(externalUrl.trim());
                  setShowCrawlInput(false);
                  setExternalUrl("");
                }}
              >
                Crawl Site
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowCrawlInput(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {hasResults && (
            <Button onClick={() => session.confirm()} size="lg">
              Looks Good — Save Results
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => session.searchDeeper(canvasUrl)}
          >
            Search Harder
          </Button>
          {!showCrawlInput && (
            <Button
              variant="secondary"
              onClick={() => setShowCrawlInput(true)}
            >
              Crawl External URL
            </Button>
          )}
          <Button variant="ghost" onClick={handleDiscard} disabled={discarding}>
            {discarding ? <><Spinner className="h-3 w-3 mr-1.5" />Discarding...</> : "Discard & Start Over"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Completed ──
  if (session.status === "completed") {
    return (
      <div className="space-y-6">
        <BackButton />
        <Card className="py-8 text-center space-y-3 !border-green-200 dark:!border-green-800 !bg-green-50 dark:!bg-green-900/20">
          <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">
            Import Complete!
          </h2>
          <p className="text-green-700 dark:text-green-400 text-sm">
            {session.classesFound
              ? `Found and imported ${session.classesFound} classes.`
              : "Your classes have been imported."}
          </p>
          {session.lastStepSummary && (
            <p className="text-xs text-green-600 dark:text-green-500">{session.lastStepSummary}</p>
          )}
        </Card>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button onClick={() => (window.location.href = "/dashboard")}>
            View Classes
          </Button>
          <Button variant="secondary" onClick={() => (window.location.href = "/calendar")}>
            Export to Calendar
          </Button>
          <Button variant="ghost" onClick={handleDiscard} disabled={discarding}>
            {discarding ? <><Spinner className="h-3 w-3 mr-1.5" />Resetting...</> : "Import Again"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Failed ──
  if (session.status === "failed") {
    return (
      <div className="space-y-6">
        <BackButton />
        <Card className="py-8 text-center space-y-3 !border-red-200 dark:!border-red-800 !bg-red-50 dark:!bg-red-900/20">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">
            Connection Failed
          </h2>
          <p className="text-red-700 dark:text-red-400 text-sm max-w-md mx-auto">
            {session.error || "Something went wrong. Please try again."}
          </p>
        </Card>
        <div className="flex justify-center gap-3 flex-wrap">
          <Button onClick={handleConnect}>Try Again</Button>
          <Button variant="ghost" onClick={handleDiscard} disabled={discarding}>
            {discarding ? <><Spinner className="h-3 w-3 mr-1.5" />Resetting...</> : "Start Fresh"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

function IframeOrFallback({ liveUrl, title }: { liveUrl: string | null; title: string }) {
  if (liveUrl) {
    return (
      <>
        <BrowserFrame src={liveUrl} title={title} />
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Iframe not loading?</strong>{" "}
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
            >
              Open the browser in a new tab
            </a>{" "}
            and come back here when done.
          </p>
        </div>
      </>
    );
  }

  return (
    <Card className="py-8 text-center space-y-3">
      <p className="text-[#8F8F8F]">Waiting for browser session...</p>
      <div className="h-6 w-6 mx-auto rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </Card>
  );
}
