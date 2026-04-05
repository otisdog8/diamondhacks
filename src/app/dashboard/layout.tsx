"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV_ITEMS = [
  { label: "Today",    href: "/dashboard" },
  { label: "Schedule", href: "/dashboard/schedule" },
  { label: "Focus",    href: "/focus" },
  { label: "Settings", href: "/dashboard/settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const { theme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) window.location.href = "/login";
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const initial = user.username.charAt(0).toUpperCase();

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F5F6F8] dark:bg-[#0F1117]">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-[#EBEBEB] dark:border-[#1E2235] bg-white/95 dark:bg-[#1A1D27]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">

          {/* Logo + nav */}
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm font-bold text-[#000000] dark:text-[#F5F6F8] tracking-tight"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500 text-[11px] font-bold text-white leading-none">
                i
              </span>
              inBtwn
            </Link>

            <nav style={{ display: "flex", gap: 2 }}>
              {NAV_ITEMS.map(({ label, href }) => {
                const active = href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(href);
                return (
                  <Link
                    key={label}
                    href={href}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#F0F1F5] text-[#000000] dark:bg-[#22263A] dark:text-[#F5F6F8]"
                        : "text-[#8F8F8F] hover:bg-[#F5F6F8] hover:text-[#464646] dark:hover:bg-[#22263A] dark:hover:text-[#C8C8C8]"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User controls */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="w-px h-4 bg-[#D3D3D3] dark:bg-[#2E3347]" />
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
              {initial}
            </div>

            {/* Sign out */}
            <button
              onClick={async () => { await logout(); window.location.href = "/login"; }}
              className="text-[#8F8F8F] hover:text-[#464646] dark:text-[#8F8F8F] dark:hover:text-[#C8C8C8] rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className={`w-full flex-1 ${
        pathname.startsWith("/dashboard/schedule")
          ? "px-0 py-0"
          : "mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      }`}>
        {children}
      </main>

    </div>
  );
}
