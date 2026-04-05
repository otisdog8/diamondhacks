"use client";

import { useState, useEffect } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const WORK_SECS  = 20 * 60;
const BREAK_SECS =  5 * 60;

type Phase = "work" | "break";
type State = "idle" | "running" | "paused" | "done";

// Full-screen ring dimensions
const FULL_R  = 100;
const FULL_C  = 2 * Math.PI * FULL_R;  // ≈ 628.3

// Compact ring dimensions
const COMP_R  = 36;
const COMP_C  = 2 * Math.PI * COMP_R;  // ≈ 226.2

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmt(secs: number) {
  return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
}

const PHASE_CONFIG = {
  work: {
    bg:           "from-sky-100 via-white to-blue-50",
    track:        "#BAE6FD",   // sky-200
    ring:         "#38BDF8",   // sky-400
    glow:         "rgba(186,230,253,0.55)",
    label:        "Focus Time",
    sublabel:     "Deep work session",
    breakPrompt:  "Well done. Take a breath.",
    buttonBg:     "rgba(56,189,248,0.85)",
  },
  break: {
    bg:           "from-cyan-50 via-white to-teal-50",
    track:        "#A5F3FC",   // cyan-200
    ring:         "#06B6D4",   // cyan-500
    glow:         "rgba(165,243,252,0.55)",
    label:        "Take a Breath",
    sublabel:     "Short break",
    breakPrompt:  "Break over. Ready to focus?",
    buttonBg:     "rgba(6,182,212,0.85)",
  },
};

// ─── Shared timer hook ────────────────────────────────────────────────────────

function useTimer() {
  const [phase, setPhase]       = useState<Phase>("work");
  const [timerState, setState]  = useState<State>("idle");
  const [timeLeft, setTimeLeft] = useState(WORK_SECS);
  const [sessions, setSessions] = useState(0);

  const totalTime = phase === "work" ? WORK_SECS : BREAK_SECS;
  const progress  = timeLeft / totalTime;   // 1 → 0 as timer runs
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

  // dashoffset: 0 = full ring, FULL_C = empty ring
  const dashOffset = FULL_C * (1 - progress);
  const isDone     = timerState === "done";
  const isRunning  = timerState === "running";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br ${cfg.bg} transition-all duration-1000`}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/50 text-sky-500 hover:bg-white/70 transition text-sm"
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
              className={`w-2 h-2 rounded-full transition-all duration-300
                ${i < sessions % 4 ? "bg-sky-400" : "bg-sky-200"}`}
            />
          ))}
          {sessions > 0 && (
            <span className="text-xs text-sky-400 ml-1 font-medium">
              {sessions} done
            </span>
          )}
        </div>
      </div>

      {/* Phase label */}
      <p className="text-xs font-semibold tracking-[0.2em] uppercase text-sky-400 mb-10 animate-fade-up">
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
          {/* Track */}
          <circle
            cx={110} cy={110} r={FULL_R}
            fill="none"
            stroke={cfg.track}
            strokeWidth={3}
            strokeOpacity={0.5}
          />
          {/* Progress — rotated so it starts at 12 o'clock */}
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
            className="text-5xl font-extralight tabular-nums tracking-tight"
            style={{ color: "#0C4A6E" }}
          >
            {fmt(timeLeft)}
          </span>
          <span className="text-xs text-sky-400 font-medium tracking-widest uppercase">
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Done prompt */}
      {isDone && (
        <div className="mt-10 flex flex-col items-center gap-4 animate-fade-up">
          <p className="text-sm text-slate-500 font-medium">{cfg.breakPrompt}</p>
          <div className="flex gap-3">
            {phase === "work" ? (
              <>
                <button
                  onClick={t.startBreak}
                  className="px-6 py-2.5 rounded-full text-sm font-medium text-white transition"
                  style={{ background: cfg.buttonBg, backdropFilter: "blur(8px)" }}
                >
                  Take a break
                </button>
                <button
                  onClick={t.backToWork}
                  className="px-6 py-2.5 rounded-full text-sm font-medium text-sky-600 bg-white/60 hover:bg-white/80 transition"
                >
                  Skip break
                </button>
              </>
            ) : (
              <button
                onClick={t.backToWork}
                className="px-6 py-2.5 rounded-full text-sm font-medium text-white transition"
                style={{ background: cfg.buttonBg, backdropFilter: "blur(8px)" }}
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
          {/* Reset */}
          <button
            onClick={t.reset}
            disabled={timerState === "idle"}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/50 text-sky-400 hover:bg-white/70 disabled:opacity-30 transition text-lg"
            aria-label="Reset"
          >
            ↺
          </button>

          {/* Play / Pause */}
          <button
            onClick={isRunning ? t.pause : t.start}
            className="w-16 h-16 flex items-center justify-center rounded-full text-white text-xl transition hover:scale-105 active:scale-95"
            style={{ background: cfg.buttonBg, boxShadow: `0 8px 24px ${cfg.glow}`, backdropFilter: "blur(8px)" }}
            aria-label={isRunning ? "Pause" : "Start"}
          >
            {isRunning ? "⏸" : "▶"}
          </button>

          {/* Skip */}
          <button
            onClick={t.skip}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/50 text-sky-400 hover:bg-white/70 transition text-lg"
            aria-label="Skip"
          >
            ⏭
          </button>
        </div>
      )}

      {/* Sublabel */}
      {!isDone && (
        <p className="mt-5 text-xs text-sky-300 tracking-wide">{cfg.sublabel}</p>
      )}
    </div>
  );
}

// ─── Compact Timer (sidebar / SmartDayView) ───────────────────────────────────

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
          <circle cx={42} cy={42} r={COMP_R} fill="none" stroke={cfg.track} strokeWidth={3} strokeOpacity={0.5} />
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
          <span className="text-sm font-light tabular-nums text-sky-700">{fmt(timeLeft)}</span>
          <span className="text-[9px] text-sky-400 uppercase tracking-wider">
            {phase === "work" ? "focus" : "break"}
          </span>
        </div>
      </div>

      {/* Done prompt */}
      {isDone && (
        <div className="flex gap-1.5">
          {phase === "work" ? (
            <button onClick={t.startBreak} className="text-xs px-2.5 py-1 rounded-full bg-sky-100 text-sky-600 hover:bg-sky-200 transition">
              Break
            </button>
          ) : (
            <button onClick={t.backToWork} className="text-xs px-2.5 py-1 rounded-full bg-sky-100 text-sky-600 hover:bg-sky-200 transition">
              Focus
            </button>
          )}
        </div>
      )}

      {/* Controls */}
      {!isDone && (
        <div className="flex items-center gap-2">
          <button
            onClick={t.reset}
            disabled={timerState === "idle"}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-sky-50 text-sky-400 hover:bg-sky-100 disabled:opacity-30 transition text-sm"
          >
            ↺
          </button>
          <button
            onClick={isRunning ? t.pause : t.start}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white text-sm transition hover:scale-105"
            style={{ background: cfg.buttonBg }}
          >
            {isRunning ? "⏸" : "▶"}
          </button>
          <button
            onClick={t.skip}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-sky-50 text-sky-400 hover:bg-sky-100 transition text-sm"
          >
            ⏭
          </button>
        </div>
      )}
      <p className="text-[10px] text-sky-300 tracking-wide">20 min · distraction-free</p>
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
    <div className="glass rounded-2xl py-4 px-3">
      <p className="text-sm font-semibold text-gray-900 mb-3 text-center">
        Focus Timer
      </p>
      <CompactTimer onExpand={() => setExpanded(true)} />
    </div>
  );
}
