"use client";

import { useState } from "react";
import { TodoPanel } from "@/components/extensions/TodoPanel";
import { ReminderSetup } from "@/components/extensions/ReminderSetup";
import { StudyPanel } from "@/components/extensions/StudyPanel";
import { LecturePanel } from "@/components/extensions/LecturePanel";
import { AssignmentPanel } from "@/components/extensions/AssignmentPanel";
import type { ClassInfo } from "@/hooks/useClasses";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TABS = ["Assignments", "Todos", "Reminders", "Study", "Lectures"] as const;
type Tab = (typeof TABS)[number];

const TAB_COLORS: Record<Tab, string> = {
  Assignments: "#FFB020",
  Todos:       "#5B6CFF",
  Reminders:   "#FF5C5C",
  Study:       "#45D483",
  Lectures:    "#9C8CFF",
};

interface ClassCardProps {
  classInfo: ClassInfo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ClassCard({ classInfo, onToggle, onDelete }: ClassCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Assignments");

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
        transition: "box-shadow 0.2s, opacity 0.2s",
        opacity: classInfo.enabled ? 1 : 0.55,
        boxShadow: "0 1px 4px rgba(31,31,46,0.06)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(91,108,255,0.10)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(31,31,46,0.06)")}
    >
      {/* Card header */}
      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: classInfo.enabled ? "var(--indigo)" : "var(--muted)",
            marginTop: 7, flexShrink: 0, transition: "background 0.2s",
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--dark)", letterSpacing: "-0.3px" }}>
                {classInfo.code}
              </h3>
              <button
                onClick={() => onToggle(classInfo.id)}
                style={{
                  width: 36, height: 20, borderRadius: 999, border: "none",
                  background: classInfo.enabled ? "var(--indigo)" : "#d1d5e8",
                  position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
                }}
              >
                <span style={{
                  position: "absolute", top: 3,
                  left: classInfo.enabled ? 18 : 3,
                  width: 14, height: 14, borderRadius: "50%",
                  background: "#fff", transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{classInfo.name}</p>
            <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
              {classInfo.instructor && (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{classInfo.instructor}</span>
              )}
              {classInfo.term && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: "var(--indigo)",
                  background: "var(--primary-light)", padding: "2px 8px", borderRadius: 999,
                }}>
                  {classInfo.term}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setExpanded((e) => !e)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                color: "var(--indigo)", background: "var(--primary-light)", border: "none",
                cursor: "pointer", transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#d8dbff")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--primary-light)")}
            >
              {expanded ? "Less ▲" : "More ▼"}
            </button>
            <button
              onClick={() => onDelete(classInfo.id)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                color: "var(--soft-red)", background: "#fff0f0", border: "none",
                cursor: "pointer", transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#ffe0e0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff0f0")}
            >
              Remove
            </button>
          </div>
        </div>

        {/* Schedule */}
        {classInfo.schedule.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Schedule
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {classInfo.schedule.map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 6, fontSize: 12,
                  background: "var(--bg-subtle)", borderRadius: 8, padding: "4px 10px", color: "var(--dark)",
                }}>
                  <span style={{ fontWeight: 700, color: "var(--indigo)", minWidth: 28 }}>{DAY_NAMES[s.dayOfWeek]}</span>
                  <span>{s.startTime}–{s.endTime}</span>
                  {s.location && <span style={{ color: "var(--muted)" }}>@ {s.location}</span>}
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--mint)", background: "#edfbf3", padding: "1px 6px", borderRadius: 999 }}>
                    {s.type === "office_hours" ? "OH" : s.type}
                  </span>
                  {s.host && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#0d9488" }}>{s.host}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* External links */}
        {classInfo.externalLinks.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              External Links
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {classInfo.externalLinks.slice(0, 5).map((link, i) => {
                let isUrl = false;
                let label = link;
                try { const u = new URL(link); isUrl = true; label = u.hostname; } catch { /* not a URL */ }
                const style = {
                  fontSize: 11, color: "var(--indigo)", background: "var(--primary-light)",
                  padding: "2px 8px", borderRadius: 999, textDecoration: "none" as const,
                  maxWidth: 180, overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const,
                };
                return isUrl ? (
                  <a key={i} href={link} target="_blank" rel="noopener noreferrer" style={style}>{label}</a>
                ) : (
                  <span key={i} style={style}>{label}</span>
                );
              })}
              {classInfo.externalLinks.length > 5 && (
                <span style={{ fontSize: 11, color: "var(--muted)", padding: "2px 4px" }}>
                  +{classInfo.externalLinks.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {classInfo.lastScrapedAt && (
          <p style={{ marginTop: 10, fontSize: 11, color: "#b0b3c8" }}>
            Last scraped: {new Date(classInfo.lastScrapedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Expandable panels */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
          {/* Tab bar */}
          <div style={{ display: "flex", gap: 2, padding: "12px 24px 0", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
            {TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "8px 16px", borderRadius: "8px 8px 0 0", fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    color: active ? TAB_COLORS[tab] : "var(--muted)",
                    background: active ? "#fff" : "transparent",
                    border: "none",
                    borderBottom: active ? `2px solid ${TAB_COLORS[tab]}` : "2px solid transparent",
                    cursor: "pointer", transition: "all 0.15s",
                    fontFamily: "'Poppins', sans-serif", whiteSpace: "nowrap",
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Panel */}
          <div style={{ padding: 24 }}>
            {activeTab === "Assignments" && (
              <AssignmentPanel classId={classInfo.id} className={classInfo.code} canvasUrl="https://canvas.ucsd.edu" />
            )}
            {activeTab === "Todos" && (
              <TodoPanel classId={classInfo.id} className={classInfo.code} canvasUrl="https://canvas.ucsd.edu" />
            )}
            {activeTab === "Reminders" && (
              <ReminderSetup classId={classInfo.id} className={classInfo.code} />
            )}
            {activeTab === "Study" && (
              <StudyPanel classId={classInfo.id} className={classInfo.code} />
            )}
            {activeTab === "Lectures" && (
              <LecturePanel classId={classInfo.id} className={classInfo.code} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
