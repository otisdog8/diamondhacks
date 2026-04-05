"use client";

import { useState, useEffect } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const WORK_SECS  = 20 * 60;
const BREAK_SECS =  5 * 60;

type Phase = "work" | "break";
type State = "idle" | "running" | "paused" | "done";

// Full-screen ring dimensions
const FULL_R = 100;
const FULL_C = 2 * Math.PI * FULL_R; // ≈ 628.3

// Compact ring dimensions
const COMP_R = 36;
const COMP_C = 2 * Math.PI * COMP_R; // ≈ 226.2

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmt(secs: number) {
  return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
}

const PHASE_CONFIG = {
  work: {
    track:       "#CFFAFE",   // teal-100
    ring:        "#60CCD4",   // brand teal (secondary accent)
    glow:        "rgba(96,204,212,0.18)",
    label:       "Focus Time",
    sublabel:    "Deep focus session",
    breakPrompt: "Well done. Take a breath.",
    buttonBg:    "#1A7F8C",   // dark teal — WCAG AA on white/dark
  },
  break: {
    track:       "#CFFAFE",   // teal-100
    ring:        "#60CCD4",   // brand teal
    glow:        "rgba(96,204,212,0.18)",
    label:       "Take a Breath",
    sublabel:    "Short break",
    breakPrompt: "Break over. Ready to focus?",
    buttonBg:    "#1A7F8C",
  },
};

// ─── Shared timer hook ────────────────────────────────────────────────────────

function useTimer() {
  const [phase, setPhase]       = useState<Phase>("work");
  const [timerState, setState]  = useState<State>("idle");
  const [timeLeft, setTimeLeft] = useState(WORK_SECS);
  const [sessions, setSessions] = useState(0);

  const totalTime = phase === "work" ? WORK_SECS : BREAK_SECS;
  const progress  = timeLeft / totalTime;
  const cfg       = PHASE_CONFIG[phase];

  useEffect(() => {
    if (timerState !== "running") return;
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [timerState]);

  useEffect(() => {
    if (timeLeft === 0 && timerState === "running") setState("done");
  }, [timeLeft, timerState]);

  const start  = () => setState("running");
  const pause  = () => setState("paused");
  const reset  = () => { setState("idle"); setTimeLeft(phase === "work" ? WORK_SECS : BREAK_SECS); };
  const skip   = () => { setState("done"); setTimeLeft(0); };

  const startBreak = () => {
    setPhase("break");
    setTimeLeft(BREAK_SECS);
    setState("running");
    if (phase === "work") setSessions(s => s + 1);
  };

  const backToWork = () => {
    setPhase("work");
    setTimeLeft(WORK_SECS);
    setState("idle");
  };

  return { phase, timerState, timeLeft, sessions, totalTime, progress, cfg, start, pause, reset, skip, startBreak, backToWork };
}

// ─── Full-screen Timer ────────────────────────────────────────────────────────

function FullTimer({ onClose }: { onClose?: () => void }) {
  const t = useTimer();
  const { phase, timerState, timeLeft, sessions, progress, cfg } = t;

  const dashOffset = FULL_C * (1 - progress);
  const isDone     = timerState === "done";
  const isRunning  = timerState === "running";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-1000
        ${phase === "work"
          ? "bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-[#0F1117] dark:via-[#111318] dark:to-[#0D1E20]"
          : "bg-gradient-to-br from-slate-50 via-white to-cyan-50/80 dark:from-[#0F1117] dark:via-[#111318] dark:to-[#0D1A1C]"
        }`}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 dark:bg-[#1A1D27]/80 border border-[#D3D3D3]/60 dark:border-[#2E3347]/60 text-[#464646] dark:text-[#C8C8C8] hover:bg-white dark:hover:bg-[#22263A] hover:text-[#000000] dark:hover:text-[#F5F6F8] transition text-sm font-medium"
            aria-label="Back"
          >
            ←
          </button>
        )}
        <div className="flex-1" />
        {/* Session dots */}
        <div className="flex gap-2 items-center">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i < sessions % 4 ? "bg-[#60CCD4]" : "bg-[#D3D3D3] dark:bg-[#2E3347]"
              }`}
            />
          ))}
          {sessions > 0 && (
            <span className="text-xs text-[#464646] dark:text-[#C8C8C8] ml-1 font-medium">
              {sessions} done
            </span>
          )}
        </div>
      </div>

      {/* Phase label */}
      <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#464646] dark:text-[#8F8F8F] mb-10 animate-fade-up">
        {phase === "work" ? "Focus Session" : "Short Break"}
      </p>

      {/* Ring area */}
      <div className="relative flex items-center justify-center">
        {/* Ambient glow */}
        <div
          className="absolute rounded-full animate-breathe-glow pointer-events-none"
          style={{
            width: 300, height: 300,
            background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
            filter: "blur(22px)",
          }}
        />

        {/* SVG ring */}
        <svg
          viewBox="0 0 220 220"
          width={220} height={220}
          className="relative"
          style={{ filter: `drop-shadow(0 0 12px ${cfg.glow})` }}
        >
          <circle
            cx={110} cy={110} r={FULL_R}
            fill="none"
            stroke={cfg.track}
            strokeWidth={3}
            strokeOpacity={1}
          />
          <circle
            cx={110} cy={110} r={FULL_R}
            fill="none"
            stroke={cfg.ring}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={FULL_C}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 110 110)"
            style={{ transition: isRunning ? "stroke-dashoffset 1s linear" : "none" }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute flex flex-col items-center gap-1 select-none">
          <span
            className="text-5xl font-extralight tabular-nums tracking-tight text-[#000000] dark:text-[#F5F6F8]"
          >
            {fmt(timeLeft)}
          </span>
          <span className="text-xs text-[#464646] dark:text-[#8F8F8F] font-medium tracking-widest uppercase">
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Done prompt */}
      {isDone && (
        <div className="mt-10 flex flex-col items-center gap-4 animate-fade-up">
          <p className="text-sm text-[#464646] dark:text-[#C8C8C8] font-medium">{cfg.breakPrompt}</p>
          <div className="flex gap-3">
            {phase === "work" ? (
              <>
                <button
                  onClick={t.startBreak}
                  className="px-6 py-2.5 rounded-full text-sm font-medium text-white transition hover:opacity-90"
                  style={{ background: cfg.buttonBg }}
                >
                  Take a break
                </button>
                <button
                  onClick={t.backToWork}
                  className="px-6 py-2.5 rounded-full text-sm font-medium text-[#464646] dark:text-[#C8C8C8] bg-white/80 dark:bg-[#1A1D27]/80 border border-[#D3D3D3] dark:border-[#2E3347] hover:bg-white dark:hover:bg-[#22263A] transition"
                >
                  Skip break
                </button>
              </>
            ) : (
              <button
                onClick={t.backToWork}
                className="px-6 py-2.5 rounded-full text-sm font-medium text-white transition hover:opacity-90"
                style={{ background: cfg.buttonBg }}
              >
                Start focusing
              </button>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      {!isDone && (
        <div className="mt-12 flex items-center gap-5">
          {/* Reset / Replay */}
          <button
            onClick={t.reset}
            disabled={timerState === "idle"}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/80 dark:bg-[#1A1D27]/80 border border-[#D3D3D3]/70 dark:border-[#2E3347]/70 text-[#464646] dark:text-[#C8C8C8] hover:bg-white dark:hover:bg-[#22263A] hover:text-[#000000] dark:hover:text-[#F5F6F8] disabled:opacity-30 disabled:cursor-not-allowed transition"
            aria-label="Reset"
            title="Reset timer"
          >
            {/* Replay / reset icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>

          {/* Play / Pause */}
          <button
            onClick={isRunning ? t.pause : t.start}
            className="w-16 h-16 flex items-center justify-center rounded-full text-white text-xl transition hover:opacity-90 active:scale-95"
            style={{ background: cfg.buttonBg, boxShadow: `0 8px 24px ${cfg.glow}` }}
            aria-label={isRunning ? "Pause" : "Start"}
          >
            {isRunning ? "⏸" : "▶"}
          </button>

          {/* Skip */}
          <button
            onClick={t.skip}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/80 dark:bg-[#1A1D27]/80 border border-[#D3D3D3]/70 dark:border-[#2E3347]/70 text-[#464646] dark:text-[#C8C8C8] hover:bg-white dark:hover:bg-[#22263A] hover:text-[#000000] dark:hover:text-[#F5F6F8] transition"
            aria-label="Skip"
            title="Skip to end"
          >
            {/* Skip forward icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>
        </div>
      )}

      {/* Sublabel */}
      {!isDone && (
        <p className="mt-5 text-xs text-[#464646] dark:text-[#8F8F8F] font-medium tracking-wide">{cfg.sublabel}</p>
      )}
    </div>
  );
}

// ─── Compact Timer ────────────────────────────────────────────────────────────

function CompactTimer({ onExpand }: { onExpand?: () => void }) {
  const t = useTimer();
  const { phase, timerState, timeLeft, progress, cfg } = t;

  const dashOffset = COMP_C * (1 - progress);
  const isDone     = timerState === "done";
  const isRunning  = timerState === "running";

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* Mini ring */}
      <div
        className="relative flex items-center justify-center cursor-pointer"
        onClick={onExpand}
        title="Open full timer"
      >
        <svg viewBox="0 0 84 84" width={84} height={84}>
          <circle cx={42} cy={42} r={COMP_R} fill="none" stroke={cfg.track} strokeWidth={3} />
          <circle
            cx={42} cy={42} r={COMP_R}
            fill="none"
            stroke={cfg.ring}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={COMP_C}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 42 42)"
            style={{ transition: isRunning ? "stroke-dashoffset 1s linear" : "none" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-sm font-light tabular-nums text-[#000000] dark:text-[#F5F6F8]">{fmt(timeLeft)}</span>
          <span className="text-[9px] text-[#464646] dark:text-[#C8C8C8] uppercase tracking-wider">
            {phase === "work" ? "focus" : "break"}
          </span>
        </div>
      </div>

      {/* Done prompt */}
      {isDone && (
        <div className="flex gap-1.5">
          {phase === "work" ? (
            <button onClick={t.startBreak} className="text-xs px-2.5 py-1 rounded-full bg-[#EBF8FA] dark:bg-[#0D2F33] text-[#1A7F8C] dark:text-[#60CCD4] hover:bg-[#D4F3F6] dark:hover:bg-[#113740] transition font-medium">
              Break
            </button>
          ) : (
            <button onClick={t.backToWork} className="text-xs px-2.5 py-1 rounded-full bg-[#EBF8FA] dark:bg-[#0D2F33] text-[#1A7F8C] dark:text-[#60CCD4] hover:bg-[#D4F3F6] dark:hover:bg-[#113740] transition font-medium">
              Focus
            </button>
          )}
        </div>
      )}

      {/* Controls */}
      {!isDone && (
        <div className="flex items-center gap-2">
          {/* Reset */}
          <button
            onClick={t.reset}
            disabled={timerState === "idle"}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#F0F1F5] dark:bg-[#22263A] text-[#464646] dark:text-[#C8C8C8] hover:bg-[#E5E6EC] dark:hover:bg-[#2E3347] disabled:opacity-30 disabled:cursor-not-allowed transition"
            aria-label="Reset"
            title="Reset"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          {/* Play/Pause */}
          <button
            onClick={isRunning ? t.pause : t.start}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white text-sm transition hover:opacity-90 active:scale-95"
            style={{ background: cfg.buttonBg }}
            aria-label={isRunning ? "Pause" : "Start"}
          >
            {isRunning ? "⏸" : "▶"}
          </button>
          {/* Skip */}
          <button
            onClick={t.skip}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#F0F1F5] dark:bg-[#22263A] text-[#464646] dark:text-[#C8C8C8] hover:bg-[#E5E6EC] dark:hover:bg-[#2E3347] transition"
            aria-label="Skip"
            title="Skip"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>
        </div>
      )}
      <p className="text-[10px] text-[#8F8F8F] tracking-wide">20 min · distraction-free</p>
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

interface FocusTimerProps {
  fullscreen?: boolean;
  onClose?: () => void;
}

export function FocusTimer({ fullscreen = false, onClose }: FocusTimerProps) {
  const [expanded, setExpanded] = useState(false);

  if (fullscreen || expanded) {
    return <FullTimer onClose={onClose ?? (() => setExpanded(false))} />;
  }

  return (
    <div className="bg-white dark:bg-[#1A1D27] border border-[#EBEBEB] dark:border-[#1E2235] rounded-xl py-4 px-3 shadow-sm">
      <p className="text-sm font-semibold text-[#000000] dark:text-[#F5F6F8] mb-3 text-center">
        Focus Timer
      </p>
      <CompactTimer onExpand={() => setExpanded(true)} />
    </div>
  );
}
