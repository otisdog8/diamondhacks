"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Home() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) window.location.href = "/dashboard";
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #5B6CFF", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>

      {/* ── Banner hero ── */}
      <div style={{
        background: "#1F1F2E",
        position: "relative",
        overflow: "hidden",
        padding: "80px 24px 72px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 360,
      }}>
        {/* Background glows */}
        <div style={{ position: "absolute", top: -80, left: -80, width: 400, height: 400, borderRadius: "50%", background: "#5B6CFF", opacity: 0.07, filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: -80, right: -80, width: 400, height: 400, borderRadius: "50%", background: "#9C8CFF", opacity: 0.07, filter: "blur(60px)" }} />

        {/* Logo wordmark */}
        <div style={{ position: "relative", marginBottom: 24, textAlign: "center" }}>
          <span style={{ fontSize: 72, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>
            <span style={{ color: "#5B6CFF" }}>in</span>
            <span style={{ color: "#F8F9FD" }}>btwn</span>
          </span>
          <p style={{ marginTop: 8, fontSize: 11, fontWeight: 400, letterSpacing: 5, color: "#6A6A80", textTransform: "uppercase" }}>
            Schedule Smarter
          </p>
        </div>

        {/* Tagline */}
        <p style={{ color: "#6A6A80", fontSize: 16, fontWeight: 400, maxWidth: 440, textAlign: "center", lineHeight: 1.7, marginBottom: 36 }}>
          A calm, intelligent schedule companion.<br />
          Import your Canvas classes. Own your time.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/register">
            <button style={{
              padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: "#5B6CFF", color: "#fff", border: "none", cursor: "pointer",
              fontFamily: "inherit", transition: "opacity 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Get started free
            </button>
          </Link>
          <Link href="/login">
            <button style={{
              padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 600,
              background: "rgba(255,255,255,0.07)", color: "#F8F9FD",
              border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
              fontFamily: "inherit", transition: "background 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.13)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            >
              Sign in
            </button>
          </Link>
        </div>
      </div>

      {/* ── Feature cards ── */}
      <div style={{ background: "#F8F9FD", flex: 1, padding: "56px 24px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          maxWidth: 720,
          margin: "0 auto",
        }}>
          {[
            {
              step: "01",
              color: "#5B6CFF",
              title: "Connect Canvas",
              desc: "Log in once through a secure browser session. Your credentials never leave your device.",
            },
            {
              step: "02",
              color: "#9C8CFF",
              title: "Import Classes",
              desc: "AI navigates your Canvas courses and extracts your full schedule automatically.",
            },
            {
              step: "03",
              color: "#FFB020",
              title: "Own Your Day",
              desc: "See your week at a glance, track assignments, and export directly to Google Calendar.",
            },
          ].map(({ step, color, title, desc }) => (
            <div key={step} style={{
              background: "#fff",
              borderRadius: 16,
              padding: "24px 20px",
              border: "1px solid #e2e3f0",
              boxShadow: "0 1px 4px rgba(31,31,46,0.05)",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 2 }}>{step}</span>
              <h3 style={{ marginTop: 8, fontSize: 15, fontWeight: 700, color: "#1F1F2E" }}>{title}</h3>
              <p style={{ marginTop: 6, fontSize: 13, color: "#6A6A80", lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
