"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode     = "focus" | "shortBreak" | "longBreak";
type RunState = "idle" | "running" | "paused" | "done";

interface Settings {
  focusMins:      number;
  shortBreakMins: number;
  longBreakMins:  number;
  autoStart:      boolean;
}

const DEFAULTS: Settings = { focusMins: 20, shortBreakMins: 5, longBreakMins: 15, autoStart: false };
const STORAGE_KEY = "inbtwn_timer_v1";

// ─── Ring geometry ────────────────────────────────────────────────────────────

const FULL_R = 100;
const FULL_C = 2 * Math.PI * FULL_R;  // ≈ 628.3
const COMP_R = 36;
const COMP_C = 2 * Math.PI * COMP_R;  // ≈ 226.2

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtSecs(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }
function secsFor(mode: Mode, s: Settings): number {
  return { focus: s.focusMins, shortBreak: s.shortBreakMins, longBreak: s.longBreakMins }[mode] * 60;
}

const LABELS: Record<Mode, string> = {
  focus:      "Focus Time",
  shortBreak: "Short Break",
  longBreak:  "Long Break",
};

// Unified light-blue palette across all modes
const COLORS = {
  focus:      { track: "#DDF4FF", ring: "#93C5FD", glow: "rgba(147,197,253,0.14)", btn: "#60A5FA" },
  shortBreak: { track: "#E0F4FF", ring: "#BFE7F2", glow: "rgba(147,197,253,0.10)", btn: "#7CC4F0" },
  longBreak:  { track: "#EEF9FF", ring: "#A8D8FF", glow: "rgba(147,197,253,0.12)", btn: "#6BB8E8" },
};

// ─── useTimerLogic ────────────────────────────────────────────────────────────

function useTimerLogic() {
  const [cfg, setCfgRaw] = useState<Settings>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") }; }
    catch { return DEFAULTS; }
  });

  const [mode, setMode]         = useState<Mode>("focus");
  const [rs, setRs]             = useState<RunState>("idle");
  const [timeLeft, setTL]       = useState(() => DEFAULTS.focusMins * 60);
  const [sessions, setSessions] = useState(0);

  const saveCfg = (next: Settings) => {
    setCfgRaw(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  // Sync timeLeft when settings change and timer is idle
  useEffect(() => {
    if (rs !== "idle") return;
    setTL(secsFor(mode, cfg));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.focusMins, cfg.shortBreakMins, cfg.longBreakMins, mode]);

  // Countdown tick
  useEffect(() => {
    if (rs !== "running") return;
    const id = setInterval(() => setTL(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [rs]);

  // Timer end: count session on focus completion
  useEffect(() => {
    if (timeLeft !== 0 || rs !== "running") return;
    if (mode === "focus") setSessions(s => s + 1);
    setRs("done");
  }, [timeLeft, rs, mode]);

  // Auto-advance after done — use ref so the timeout always reads fresh values
  const autoRef = useRef({ mode, sessions, cfg });
  autoRef.current = { mode, sessions, cfg };

  useEffect(() => {
    if (rs !== "done" || !cfg.autoStart) return;
    const id = setTimeout(() => {
      const { mode: m, sessions: s, cfg: c } = autoRef.current;
      const next: Mode = m === "focus"
        ? (s % 4 === 0 && s > 0 ? "longBreak" : "shortBreak")
        : "focus";
      setMode(next);
      setTL(secsFor(next, c));
      setRs("running");
    }, 1500);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rs, cfg.autoStart]);

  // Manual mode switch (no session count)
  const go = (next: Mode) => {
    setMode(next);
    setTL(secsFor(next, cfg));
    setRs("idle");
  };

  const start = () => setRs("running");
  const pause = () => setRs("paused");
  const reset = () => { setRs("idle"); setTL(secsFor(mode, cfg)); };
  const skip  = () => { setTL(0); setRs("done"); };

  // Called from editable input — updates setting + resets timer
  const setMins = (mins: number) => {
    const n = Math.max(1, Math.min(99, mins));
    const next = { ...cfg };
    if      (mode === "focus")      next.focusMins = n;
    else if (mode === "shortBreak") next.shortBreakMins = n;
    else                            next.longBreakMins = n;
    saveCfg(next);
    setTL(n * 60);
    setRs("idle");
  };

  const total    = secsFor(mode, cfg);
  const progress = total > 0 ? timeLeft / total : 1;
  const colors   = COLORS[mode];

  return { cfg, saveCfg, mode, rs, timeLeft, sessions, total, progress, colors, go, start, pause, reset, skip, setMins };
}

type TimerLogic = ReturnType<typeof useTimerLogic>;

// ─── EditableTime ─────────────────────────────────────────────────────────────
// Displays MM:SS. When canEdit=true and clicked, shows a minutes-only input.

function EditableTime({
  secs, canEdit, className = "", onCommit,
}: {
  secs: number; canEdit: boolean; className?: string; onCommit: (mins: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const open = () => {
    if (!canEdit) return;
    setDraft(String(Math.floor(secs / 60)));
    setEditing(true);
    setTimeout(() => ref.current?.select(), 10);
  };

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 1) onCommit(n);
    setEditing(false);
  };

  if (editing) {
    return (
      <span className={className} style={{ display: "inline-flex", alignItems: "baseline" }}>
        <input
          ref={ref}
          value={draft}
          onChange={e => setDraft(e.target.value.replace(/\D/g, ""))}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          onBlur={commit}
          className="bg-transparent outline-none text-center tabular-nums border-b-2 border-[#60CCD4]"
          style={{ width: "2ch" }}
          maxLength={2}
          inputMode="numeric"
          autoFocus
        />
        <span className="opacity-40">:00</span>
      </span>
    );
  }

  return (
    <span
      className={`${className} transition-colors ${canEdit ? "cursor-pointer hover:text-[#1A7F8C] dark:hover:text-[#60CCD4]" : ""}`}
      onClick={open}
      title={canEdit ? "Tap to set duration" : undefined}
    >
      {fmtSecs(secs)}
    </span>
  );
}

// ─── SettingsBar ──────────────────────────────────────────────────────────────
// Inline editable durations: Focus 20m  ·  Short 5m  ·  Long 15m

type EditField = "focusMins" | "shortBreakMins" | "longBreakMins" | null;

function SettingsBar({ cfg, saveCfg, size = "sm" }: {
  cfg: Settings; saveCfg: (next: Settings) => void; size?: "sm" | "lg";
}) {
  const [ef,    setEf]    = useState<EditField>(null);
  const [draft, setDraft] = useState("");

  const commit = () => {
    if (!ef) return;
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 1) saveCfg({ ...cfg, [ef]: Math.min(99, n) });
    setEf(null);
  };

  const items: { label: string; field: EditField; val: number }[] = [
    { label: "Focus", field: "focusMins",      val: cfg.focusMins },
    { label: "Short", field: "shortBreakMins", val: cfg.shortBreakMins },
    { label: "Long",  field: "longBreakMins",  val: cfg.longBreakMins },
  ];

  const sz = size === "lg" ? "text-sm" : "text-xs";
  const w  = size === "lg" ? "w-8"     : "w-7";

  return (
    <div className={`flex items-center gap-3 ${sz} text-[#8F8F8F]`}>
      {items.map(({ label, field, val }) => (
        <div key={field!} className="flex items-center gap-0.5">
          <span>{label} </span>
          {ef === field ? (
            <input
              value={draft}
              onChange={e => setDraft(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEf(null); }}
              onBlur={commit}
              className={`${w} bg-transparent border-b border-[#60CCD4] outline-none text-center tabular-nums text-[#000000] dark:text-[#F5F6F8]`}
              maxLength={2}
              inputMode="numeric"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setEf(field); setDraft(String(val)); }}
              className={`${w} text-center tabular-nums text-[#1A7F8C] dark:text-[#60CCD4] font-semibold hover:text-[#0E5F6A] dark:hover:text-[#8CE8EE] transition-colors`}
            >
              {val}
            </button>
          )}
          <span>m</span>
        </div>
      ))}
    </div>
  );
}

// ─── SettingsModal ────────────────────────────────────────────────────────────

function SettingsModal({ cfg, saveCfg, onClose }: {
  cfg: Settings; saveCfg: (next: Settings) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1A1D27] border border-[#E0F4FF] dark:border-[#1E2235] rounded-2xl shadow-xl p-6 w-72">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-semibold text-[#000000] dark:text-[#F5F6F8]">Timer Settings</p>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full text-[#8F8F8F] hover:text-[#464646] hover:bg-[#F0F1F5] dark:hover:bg-[#22263A] transition text-xs"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <SettingsBar cfg={cfg} saveCfg={saveCfg} size="lg" />

          <div className="pt-3 border-t border-[#F0F1F5] dark:border-[#1E2235]">
            <label className="flex items-center gap-3 text-sm text-[#464646] dark:text-[#C8C8C8] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cfg.autoStart}
                onChange={e => saveCfg({ ...cfg, autoStart: e.target.checked })}
                className="w-4 h-4 rounded accent-[#93C5FD]"
              />
              Auto-start next session
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ModeTabs ─────────────────────────────────────────────────────────────────

function ModeTabs({ mode, go, size = "sm" }: { mode: Mode; go: (m: Mode) => void; size?: "sm" | "lg" }) {
  const padding = size === "lg" ? "px-4 py-1.5 text-sm" : "px-3 py-1 text-xs";
  return (
    <div className="flex gap-1 rounded-full bg-[#EEF9FF] dark:bg-[#0C1620] p-1">
      {(["focus", "shortBreak", "longBreak"] as Mode[]).map(m => (
        <button
          key={m}
          onClick={() => go(m)}
          className={`rounded-full ${padding} font-medium transition-all ${
            mode === m
              ? "bg-white dark:bg-[#1A1D27] text-[#5BA8E0] dark:text-[#93C5FD] shadow-sm"
              : "text-[#8F8F8F] hover:text-[#5BA8E0] dark:hover:text-[#93C5FD]"
          }`}
        >
          {m === "focus" ? "Focus" : m === "shortBreak" ? "Short" : "Long"}
        </button>
      ))}
    </div>
  );
}

// ─── Full-screen Timer ────────────────────────────────────────────────────────

function FullTimer({ t, onClose }: { t: TimerLogic; onClose?: () => void }) {
  const { mode, rs, timeLeft, sessions, progress, colors, cfg } = t;
  const [showSettings, setShowSettings] = useState(false);
  const offset  = FULL_C * (1 - progress);
  const isDone  = rs === "done";
  const isRun   = rs === "running";
  const canEdit = rs === "idle" || rs === "paused";

  const nextBreakMode: Mode = sessions % 4 === 0 && sessions > 0 ? "longBreak" : "shortBreak";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#F0F8FF] via-white to-[#EEF9FF] dark:from-[#0F1117] dark:via-[#111318] dark:to-[#0C1620]">

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        {onClose ? (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#8F8F8F] hover:text-[#464646] hover:bg-white/70 dark:hover:bg-[#1A1D27]/70 transition text-sm"
            aria-label="Back"
          >
            ←
          </button>
        ) : <div />}

        <div className="flex items-center gap-3">
          {/* Session dots */}
          <div className="flex gap-1.5 items-center">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i < sessions % 4 ? "bg-[#93C5FD]" : "bg-[#D3D3D3] dark:bg-[#2E3347]"
                }`}
              />
            ))}
            {sessions > 0 && (
              <span className="text-xs text-[#8F8F8F] ml-1">{sessions} done</span>
            )}
          </div>

          {/* Settings gear */}
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#8F8F8F] hover:text-[#464646] hover:bg-white/70 dark:hover:bg-[#1A1D27]/70 transition"
            aria-label="Timer settings"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mode tabs ── */}
      <ModeTabs mode={mode} go={t.go} size="lg" />

      {/* ── Ring + editable time ── */}
      <div className="relative flex items-center justify-center mt-10">
        {/* Ambient glow */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 280, height: 280, background: `radial-gradient(circle, ${colors.glow} 0%, transparent 65%)`, filter: "blur(28px)" }}
        />
        <svg viewBox="0 0 220 220" width={220} height={220} className="relative">
          <circle cx={110} cy={110} r={FULL_R} fill="none" stroke={colors.track} strokeWidth={2} />
          <circle
            cx={110} cy={110} r={FULL_R} fill="none"
            stroke={colors.ring} strokeWidth={2} strokeLinecap="round"
            strokeDasharray={FULL_C} strokeDashoffset={offset}
            transform="rotate(-90 110 110)"
            style={{ transition: isRun ? "stroke-dashoffset 1s linear" : "none" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute flex flex-col items-center gap-1">
          <EditableTime
            secs={timeLeft}
            canEdit={canEdit}
            className="text-5xl font-extralight tabular-nums tracking-tight text-[#1a2a3a] dark:text-[#F5F6F8]"
            onCommit={t.setMins}
          />
          <span className="text-xs text-[#8F8F8F]/70 font-medium tracking-widest uppercase">
            {canEdit && rs === "idle" ? "tap to edit" : LABELS[mode]}
          </span>
        </div>
      </div>

      {/* ── Done prompt ── */}
      {isDone && (
        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="text-sm text-[#8F8F8F] font-medium">
            {mode === "focus" ? "Well done. Take a breath." : "Break over. Ready to focus?"}
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            {mode === "focus" ? (
              <>
                <button
                  onClick={() => t.go(nextBreakMode)}
                  className="px-6 py-2.5 rounded-full text-sm font-medium text-white transition hover:opacity-90"
                  style={{ background: colors.btn }}
                >
                  {nextBreakMode === "longBreak" ? "Long break" : "Short break"}
                </button>
                <button
                  onClick={() => t.go("focus")}
                  className="px-6 py-2.5 rounded-full text-sm font-medium text-[#8F8F8F] dark:text-[#C8C8C8] bg-white/60 dark:bg-[#1A1D27]/60 border border-[#E0F4FF] dark:border-[#2E3347] hover:bg-white/80 transition"
                >
                  Skip break
                </button>
              </>
            ) : (
              <button
                onClick={() => t.go("focus")}
                className="px-6 py-2.5 rounded-full text-sm font-medium text-white transition hover:opacity-90"
                style={{ background: COLORS.focus.btn }}
              >
                Start focusing
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Controls ── */}
      {!isDone && (
        <div className="mt-10 flex items-center gap-5">
          <button
            onClick={t.reset}
            disabled={rs === "idle"}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#93C5FD]/80 hover:text-[#93C5FD] hover:bg-[#EEF9FF] dark:hover:bg-[#1A1D27] disabled:opacity-25 disabled:cursor-not-allowed transition"
            aria-label="Reset"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
          </button>

          <button
            onClick={isRun ? t.pause : t.start}
            className="w-16 h-16 flex items-center justify-center rounded-full text-white text-xl transition hover:opacity-90 active:scale-95"
            style={{ background: colors.btn, boxShadow: `0 6px 20px ${colors.glow}` }}
            aria-label={isRun ? "Pause" : "Start"}
          >
            {isRun ? "⏸" : "▶"}
          </button>

          <button
            onClick={t.skip}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#93C5FD]/80 hover:text-[#93C5FD] hover:bg-[#EEF9FF] dark:hover:bg-[#1A1D27] transition"
            aria-label="Skip"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Settings modal ── */}
      {showSettings && (
        <SettingsModal cfg={cfg} saveCfg={t.saveCfg} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

// ─── Compact Timer ────────────────────────────────────────────────────────────

function CompactTimer({ t, onExpand }: { t: TimerLogic; onExpand?: () => void }) {
  const { mode, rs, timeLeft, progress, colors, cfg } = t;
  const offset = COMP_C * (1 - progress);
  const isDone = rs === "done";
  const isRun  = rs === "running";

  return (
    <div className="flex flex-col items-center gap-3 py-1">
      {/* Mode tabs */}
      <ModeTabs mode={mode} go={t.go} />

      {/* Mini ring — click to expand */}
      <div
        className="relative flex items-center justify-center cursor-pointer group"
        onClick={onExpand}
        title="Open full timer"
      >
        <svg viewBox="0 0 84 84" width={84} height={84}>
          <circle cx={42} cy={42} r={COMP_R} fill="none" stroke={colors.track} strokeWidth={3} />
          <circle
            cx={42} cy={42} r={COMP_R} fill="none"
            stroke={colors.ring} strokeWidth={3} strokeLinecap="round"
            strokeDasharray={COMP_C} strokeDashoffset={offset}
            transform="rotate(-90 42 42)"
            style={{ transition: isRun ? "stroke-dashoffset 1s linear" : "none" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center pointer-events-none">
          <span className="text-sm font-light tabular-nums text-[#000000] dark:text-[#F5F6F8]">
            {fmtSecs(timeLeft)}
          </span>
          <span className="text-[9px] text-[#464646] dark:text-[#C8C8C8] uppercase tracking-wider">
            {mode === "focus" ? "focus" : mode === "shortBreak" ? "short" : "long"}
          </span>
        </div>
      </div>

      {/* Done prompt */}
      {isDone && (
        <div className="flex gap-1.5">
          {mode === "focus" ? (
            <>
              <button onClick={() => t.go("shortBreak")} className="text-xs px-2.5 py-1 rounded-full bg-[#DDF4FF] dark:bg-[#0C1E2E] text-[#5BA8E0] dark:text-[#93C5FD] hover:bg-[#C8ECFF] transition font-medium">Break</button>
              <button onClick={() => t.go("focus")}      className="text-xs px-2.5 py-1 rounded-full bg-[#F0F1F5] dark:bg-[#22263A] text-[#8F8F8F] hover:bg-[#E5E6EC] transition font-medium">Skip</button>
            </>
          ) : (
            <button onClick={() => t.go("focus")} className="text-xs px-2.5 py-1 rounded-full bg-[#DDF4FF] dark:bg-[#0C1E2E] text-[#5BA8E0] dark:text-[#93C5FD] hover:bg-[#C8ECFF] transition font-medium">Focus</button>
          )}
        </div>
      )}

      {/* Controls */}
      {!isDone && (
        <div className="flex items-center gap-2">
          <button onClick={t.reset} disabled={rs === "idle"} className="w-7 h-7 flex items-center justify-center rounded-full bg-[#F0F1F5] dark:bg-[#22263A] text-[#464646] dark:text-[#C8C8C8] hover:bg-[#E5E6EC] dark:hover:bg-[#2E3347] disabled:opacity-30 disabled:cursor-not-allowed transition" aria-label="Reset">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
          </button>
          <button onClick={isRun ? t.pause : t.start} className="w-9 h-9 flex items-center justify-center rounded-full text-white text-sm transition hover:opacity-90 active:scale-95" style={{ background: colors.btn }} aria-label={isRun ? "Pause" : "Start"}>
            {isRun ? "⏸" : "▶"}
          </button>
          <button onClick={t.skip} className="w-7 h-7 flex items-center justify-center rounded-full bg-[#F0F1F5] dark:bg-[#22263A] text-[#464646] dark:text-[#C8C8C8] hover:bg-[#E5E6EC] dark:hover:bg-[#2E3347] transition" aria-label="Skip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>
        </div>
      )}

      <p className="text-[10px] text-[#8F8F8F]/70 tracking-wide">{cfg.focusMins} min · tap ring to open</p>
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

interface FocusTimerProps {
  fullscreen?: boolean;
  onClose?: () => void;
  /** Controlled open state — pass alongside onExpandChange for external trigger */
  expanded?: boolean;
  onExpandChange?: (v: boolean) => void;
}

export function FocusTimer({
  fullscreen = false,
  onClose,
  expanded: expandedProp,
  onExpandChange,
}: FocusTimerProps) {
  // Single timer instance shared between compact + full views
  const timer = useTimerLogic();

  const [expandedInternal, setExpandedInternal] = useState(false);
  const isControlled = expandedProp !== undefined;
  const isExpanded   = isControlled ? expandedProp : expandedInternal;

  const setExpanded = (v: boolean) => {
    if (!isControlled) setExpandedInternal(v);
    onExpandChange?.(v);
  };

  if (fullscreen || isExpanded) {
    return <FullTimer t={timer} onClose={onClose ?? (() => setExpanded(false))} />;
  }

  return (
    <div className="bg-white dark:bg-[#1A1D27] border border-[#EBEBEB] dark:border-[#1E2235] rounded-xl py-4 px-3 shadow-sm">
      <p className="text-sm font-semibold text-[#000000] dark:text-[#F5F6F8] mb-3 text-center">
        Focus Timer
      </p>
      <CompactTimer t={timer} onExpand={() => setExpanded(true)} />
    </div>
  );
}
