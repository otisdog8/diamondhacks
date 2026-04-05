"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
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
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) window.location.href = "/login";
  }, [user, loading]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #5B6CFF", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const initial = user.username.charAt(0).toUpperCase();

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F5F6F8] dark:bg-[#0F1117]">

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#1F1F2E",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          padding: "0 24px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {/* Logo + nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>
                <span style={{ color: "#5B6CFF" }}>in</span>
                <span style={{ color: "#F8F9FD" }}>btwn</span>
              </span>
            </Link>

            <nav style={{ display: "flex", gap: 2 }}>
              {NAV_ITEMS.map(({ label, href }) => {
                const active = href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(href);
                return (
                  <Link key={label} href={href} style={{ textDecoration: "none" }}>
                    <span style={{
                      display: "inline-block", padding: "5px 12px", borderRadius: 8,
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      color: active ? "#fff" : "rgba(255,255,255,0.45)",
                      background: active ? "rgba(91,108,255,0.25)" : "transparent",
                      transition: "all 0.15s",
                    }}>
                      {label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ThemeToggle />
            <div className="w-px h-4 bg-[#D3D3D3] dark:bg-[#2E3347]" />

            {/* Avatar + dropdown */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                title="Account"
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                  menuOpen || pathname.startsWith("/dashboard/settings")
                    ? "bg-indigo-200 text-indigo-700 dark:bg-indigo-700 dark:text-white"
                    : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200 hover:text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-800"
                }`}
              >
                {initial}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-9 z-50 w-44 rounded-xl border border-[#EBEBEB] dark:border-[#1E2235] bg-white dark:bg-[#1A1D27] py-1 shadow-lg">
                  <div className="border-b border-[#EBEBEB] dark:border-[#1E2235] px-3 py-2">
                    <p className="text-xs font-semibold text-[#000000] dark:text-[#F5F6F8] truncate">
                      {user.username}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#464646] dark:text-[#C8C8C8] hover:bg-[#F0F1F5] dark:hover:bg-[#22263A] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                    </svg>
                    Settings
                  </Link>
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      await logout();
                      window.location.href = "/login";
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#464646] dark:text-[#C8C8C8] hover:bg-[#F0F1F5] dark:hover:bg-[#22263A] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
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
