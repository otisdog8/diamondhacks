"use client";

import { ConnectionWizard } from "@/components/canvas/ConnectionWizard";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function CanvasPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] dark:bg-[#0F1117]">
      {/* Minimal header */}
      <header className="border-b border-[#EBEBEB] dark:border-[#1E2235] bg-white/95 dark:bg-[#1A1D27]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-bold text-[#000000] dark:text-[#F5F6F8] tracking-tight"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500 text-[11px] font-bold text-white leading-none">
              i
            </span>
            inBtwn
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="text-sm text-[#8F8F8F] hover:text-[#464646] dark:hover:text-[#C8C8C8] transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-8 px-4">
        <ConnectionWizard />
      </div>
    </div>
  );
}
