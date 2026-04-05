"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Link from "next/link";

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
  const { theme, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) window.location.href = "/login";
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "3px solid #5B6CFF", borderTopColor: "transparent",
          animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const initial = user.username.charAt(0).toUpperCase();

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8F9FD] dark:bg-gray-950">

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#1F1F2E",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
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
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                width: 30, height: 30, borderRadius: "50%", border: "none",
                background: "rgba(255,255,255,0.07)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.5)", transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.13)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            >
              {theme === "dark" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>

            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "#5B6CFF",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#fff",
            }}>
              {initial}
            </div>

            {/* Sign out */}
            <button
              onClick={async () => { await logout(); window.location.href = "/login"; }}
              style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                color: "rgba(255,255,255,0.4)", background: "transparent",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
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
