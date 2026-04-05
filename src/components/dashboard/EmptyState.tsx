"use client";

import Link from "next/link";

// ── section label ─────────────────────────────────────────────────────────────

function Label({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-400">
      {children}
    </p>
  );
}

// ── illustrated feature cards ─────────────────────────────────────────────────

function ClassesIllustration() {
  return (
    <svg width="100%" height="72" viewBox="0 0 200 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="14" width="80" height="10" rx="5" fill="#1B4457" fillOpacity="0.18" />
      <rect x="12" y="30" width="60" height="10" rx="5" fill="#1B4457" fillOpacity="0.12" />
      <rect x="12" y="46" width="70" height="10" rx="5" fill="#1B4457" fillOpacity="0.09" />
      <rect x="104" y="14" width="48" height="10" rx="5" fill="#1B4457" fillOpacity="0.10" />
      <rect x="104" y="30" width="36" height="10" rx="5" fill="#1B4457" fillOpacity="0.07" />
      <rect x="104" y="46" width="42" height="10" rx="5" fill="#1B4457" fillOpacity="0.07" />
      <circle cx="176" cy="19" r="5" fill="#1B4457" fillOpacity="0.22" />
      <circle cx="176" cy="35" r="5" fill="#1B4457" fillOpacity="0.10" />
      <circle cx="176" cy="51" r="5" fill="#1B4457" fillOpacity="0.10" />
    </svg>
  );
}

function FreeTimeIllustration() {
  return (
    <svg width="100%" height="72" viewBox="0 0 200 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="34" width="168" height="4" rx="2" fill="#1B4457" fillOpacity="0.10" />
      <rect x="16" y="22" width="38" height="28" rx="5" fill="#1B4457" fillOpacity="0.20" />
      <rect x="78" y="22" width="44" height="28" rx="5" fill="#1B4457" fillOpacity="0.20" />
      <rect x="150" y="22" width="34" height="28" rx="5" fill="#1B4457" fillOpacity="0.20" />
      <rect x="58" y="26" width="16" height="20" rx="4" fill="#0EA5E9" fillOpacity="0.22" />
      <rect x="128" y="26" width="18" height="20" rx="4" fill="#0EA5E9" fillOpacity="0.22" />
    </svg>
  );
}

function DeadlinesIllustration() {
  return (
    <svg width="100%" height="72" viewBox="0 0 200 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="10" width="168" height="52" rx="7" fill="#1B4457" fillOpacity="0.06" />
      <rect x="16" y="10" width="168" height="16" rx="7" fill="#1B4457" fillOpacity="0.12" />
      <rect x="16" y="18" width="168" height="8" rx="0" fill="#1B4457" fillOpacity="0.12" />
      {[0,1,2,3,4,5,6].map((i) => (
        <rect key={i} x={20 + i * 23} y="32" width="17" height="14" rx="3" fill="#1B4457" fillOpacity="0.07" />
      ))}
      <circle cx="73" cy="54" r="4" fill="#F87171" fillOpacity="0.75" />
      <circle cx="119" cy="54" r="4" fill="#FBBF24" fillOpacity="0.75" />
    </svg>
  );
}

const FEATURE_CARDS = [
  {
    title: "Your Classes",
    body: "All your courses in one view — times, locations, and instructor info.",
    Illustration: ClassesIllustration,
  },
  {
    title: "Free Time Gaps",
    body: "See open blocks between classes so you can actually plan them.",
    Illustration: FreeTimeIllustration,
  },
  {
    title: "Canvas Deadlines",
    body: "Assignments pulled from Canvas and visible before they sneak up.",
    Illustration: DeadlinesIllustration,
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

// ── component ─────────────────────────────────────────────────────────────────

export function EmptyState() {
  return (
    <div className="space-y-6">

      {/* ── My Classes banner ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#23607C] to-[#1B4457] px-8 py-9 shadow-[0_2px_20px_rgba(27,68,87,0.20)]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/[0.05] blur-3xl" />
        <h2 className="text-xl font-semibold leading-snug tracking-tight text-white">
          Your semester schedule lives here
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#9BBDCC]">
          Toggle classes on or off, spot free gaps, and export to your calendar — all in one place.
        </p>
        <div className="mt-6">
          <Link href="/canvas">
            <button className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#1B4457] shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]">
              Import from Canvas
            </button>
          </Link>
        </div>
      </div>

      {/* ── Feature cards ────────────────────────────────────────────────────── */}
      <div>
        <Label>What you&apos;ll get</Label>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {FEATURE_CARDS.map(({ title, body, Illustration }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden"
            >
              <div className="px-3 pt-4 pb-0">
                <Illustration />
              </div>
              <div className="px-4 pb-4 pt-2">
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-500">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Lower row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* "Once imported" */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm lg:col-span-2">
          <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl bg-[#163847]/20" />
          <div className="p-7 pl-8">
            <Label>Once imported</Label>
            <h2 className="mt-1.5 text-base font-semibold text-gray-900">
              Everything in one place
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-500">
              Your dashboard will show your full week at a glance — no more checking Canvas, your calendar, and your notes separately.
            </p>
            <ul className="mt-5 space-y-3">
              {ONCE_IMPORTED.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-[13px] text-gray-500"
                >
                  <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#163847]/25" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* "What happens next" */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm px-6 py-6">
          <Label>What happens next</Label>
          <ol className="mt-5 space-y-5">
            {STEPS.map((s) => (
              <li key={s.n} className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[11px] font-semibold text-sky-600">
                  {s.n}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-gray-500">
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
