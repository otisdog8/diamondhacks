"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

// ── icons — raw, no containing box ───────────────────────────────────────────

function BookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

// ── data ──────────────────────────────────────────────────────────────────────

const BENEFITS = [
  {
    icon: <BookIcon />,
    title: "Your Classes",
    body: "All your courses in one view — times, locations, and instructor info.",
  },
  {
    icon: <ClockIcon />,
    title: "Free Time Gaps",
    body: "See open blocks between classes so you can actually use them.",
  },
  {
    icon: <CheckIcon />,
    title: "Canvas Deadlines",
    body: "Assignments pulled from Canvas and added to your calendar automatically.",
  },
];

const ONCE_IMPORTED = [
  "Weekly schedule with times and room numbers",
  "Free blocks between classes, sized by duration",
  "Deadlines synced and visible before they sneak up on you",
];

const STEPS = [
  {
    n: "1",
    title: "Connect Canvas",
    body: "Log in through a secure session — nothing is stored beyond your schedule.",
  },
  {
    n: "2",
    title: "We read your schedule",
    body: "AI navigates your courses and pulls times, locations, and assignments.",
  },
  {
    n: "3",
    title: "Export to Google Calendar",
    body: "One click turns it all into recurring events.",
  },
];

// ── section label — one consistent style, used sparingly ─────────────────────

function Label({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-400">
      {children}
    </p>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

export function EmptyState() {
  const { user } = useAuth();
  const name = user?.username
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1)
    : "there";

  return (
    <div className="space-y-4">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B4457] to-[#0E2C3A] px-8 py-11 shadow-[0_2px_20px_rgba(14,44,58,0.18)]">
        {/* One intentional glow — top-right, actually visible */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/[0.06] blur-3xl" />

        <Label>Welcome back</Label>
        <h1 className="mt-2 text-[2.25rem] font-semibold leading-tight tracking-tight text-white">
          Hi {name}!
        </h1>
        <p className="mt-3 max-w-[26rem] text-[0.9375rem] leading-relaxed text-[#9BBDCC]">
          Import your Canvas schedule to see your classes, free time, and upcoming deadlines — all in one place.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Link href="/canvas">
            <button className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#163847] shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]">
              Import from Canvas
            </button>
          </Link>
          <button className="text-sm text-[#7AAFC2] underline underline-offset-4 decoration-[#7AAFC2]/30 transition-colors hover:text-white hover:decoration-white/30">
            Use sample schedule
          </button>
        </div>
      </div>

      {/* ── Benefits — tinted echo of hero, no icon boxes ─────────────────────── */}
      <div className="rounded-2xl bg-[#163847]/[0.06] px-7 py-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <div
              key={b.title}
              className={`flex flex-col gap-2 ${
                i < BENEFITS.length - 1
                  ? "sm:border-r sm:border-[#163847]/10 sm:pr-6"
                  : ""
              }`}
            >
              {/* Icon directly colored, no box */}
              <span className="text-[#163847]/40">
                {b.icon}
              </span>
              <p className="text-sm font-semibold tracking-tight text-gray-800 dark:text-gray-100">
                {b.title}
              </p>
              <p className="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                {b.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Lower row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* "Once imported" — white card, left inset accent instead of top stripe */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
          {/* Left accent bar — intentional, not a gradient edge */}
          <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl bg-[#163847]/20" />
          <div className="p-7 pl-8">
            <Label>Once imported</Label>
            <h2 className="mt-1.5 text-base font-semibold tracking-tight text-gray-900 dark:text-white">
              Everything in one place
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
              Your dashboard will show your full week at a glance — no more checking Canvas, your calendar, and your notes separately.
            </p>
            <ul className="mt-5 space-y-3">
              {ONCE_IMPORTED.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-[13px] text-gray-600 dark:text-gray-300"
                >
                  <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#163847]/25 dark:bg-indigo-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* "What happens next" — teal wash at a visible depth */}
        <div className="rounded-2xl bg-[#163847]/[0.08] px-6 py-6 dark:bg-indigo-900/10">
          <Label>What happens next</Label>
          <ol className="mt-5 space-y-5">
            {STEPS.map((s) => (
              <li key={s.n} className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/80 text-[11px] font-semibold text-[#163847] shadow-sm dark:bg-gray-700 dark:text-indigo-300">
                  {s.n}
                </span>
                <div>
                  <p className="text-sm font-medium tracking-tight text-gray-800 dark:text-gray-200">
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-gray-400">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

      </div>
    </div>
  );
}
