"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function Home() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) window.location.href = "/dashboard";
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      {/* Hero */}
      <div className="max-w-xl text-center mb-14 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-widest uppercase mb-5 border border-blue-100 dark:border-blue-800">
          Student Productivity
        </div>
        <h1 className="text-6xl font-extralight tracking-tight text-[#000000] dark:text-[#F5F6F8] leading-tight">
          in<span className="font-bold text-blue-500">Btwn</span>
        </h1>
        <p className="mt-5 text-lg text-[#8F8F8F] dark:text-[#8F8F8F] font-light leading-relaxed">
          A calm, intelligent schedule companion.<br />
          Import your Canvas classes. Own your time.
        </p>

        {/* CTAs */}
        <div className="flex gap-3 justify-center mt-8">
          <Link href="/register">
            <Button>Get started free</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">Sign in</Button>
          </Link>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid gap-4 sm:grid-cols-3 max-w-2xl w-full animate-fade-up">
        {[
          {
            step: "01",
            title: "Connect Canvas",
            desc: "Log in once through a secure browser session. Your credentials never leave your device.",
          },
          {
            step: "02",
            title: "Import Classes",
            desc: "AI navigates your Canvas courses and extracts your full schedule automatically.",
          },
          {
            step: "03",
            title: "Own Your Day",
            desc: "See your week at a glance, find focus windows, and export directly to Google Calendar.",
          },
        ].map(({ step, title, desc }) => (
          <div
            key={step}
            className="bg-white dark:bg-[#1A1D27] border border-[#EBEBEB] dark:border-[#1E2235] rounded-xl p-5 text-left shadow-sm"
          >
            <span className="text-xs font-bold text-blue-400 dark:text-blue-400 tracking-widest">{step}</span>
            <h3 className="mt-2 text-sm font-semibold text-[#000000] dark:text-[#F5F6F8]">{title}</h3>
            <p className="mt-1.5 text-sm text-[#8F8F8F] dark:text-[#8F8F8F] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
