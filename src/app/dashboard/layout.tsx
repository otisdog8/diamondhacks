"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV_ITEMS = [
  { label: "Today",    href: "/dashboard" },
  { label: "Schedule", href: "/dashboard/schedule" },
  { label: "Canvas",   href: "/canvas" },
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

  useEffect(() => {
    if (!loading && !user) window.location.href = "/login";
  }, [user, loading]);

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
            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "#5B6CFF",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#fff",
            }}>
              {initial}
            </div>
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
