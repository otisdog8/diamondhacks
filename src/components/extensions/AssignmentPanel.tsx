"use client";
// ============================================================
// AssignmentPanel component
// Drop into src/components/extensions/AssignmentPanel.tsx
// ============================================================
import { useState, useEffect, useCallback } from "react";
import type { IAssignment, IMilestone } from "@/lib/extensions/assignment-types";

interface Props {
  classId: string;
  className: string;
  canvasUrl?: string;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  homework: { bg: "#eaecff", text: "#5B6CFF" },
  project:  { bg: "#f2f0ff", text: "#9C8CFF" },
  exam:     { bg: "#fff0f0", text: "#FF5C5C" },
  quiz:     { bg: "#fffbee", text: "#FFB020" },
  lab:      { bg: "#edfbf3", text: "#45D483" },
  essay:    { bg: "#fef3e2", text: "#D97706" },
  other:    { bg: "#f0f1f9", text: "#6A6A80" },
};
const FALLBACK_COLOR = { bg: "#f0f1f9", text: "#6A6A80" };

function daysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function urgencyColor(days: number | null): string {
  if (days === null) return "#6A6A80";
  if (days < 0) return "#6A6A80";
  if (days <= 2) return "#FF5C5C";
  if (days <= 5) return "#FFB020";
  return "#45D483";
}

export function AssignmentPanel({ classId, className, canvasUrl = "https://canvas.ucsd.edu" }: Props) {
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<IAssignment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/assignments?classId=${classId}`);
    const data = await res.json();
    setAssignments(data.assignments ?? []);
    setLoading(false);
  }, [classId]);

  useEffect(() => { load(); }, [load]);

  // Keep selected in sync when assignments update
  useEffect(() => {
    if (selected) {
      const refreshed = assignments.find((a) => a.id === selected.id);
      if (refreshed) setSelected(refreshed);
    }
  }, [assignments, selected]);

  async function syncCanvas() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/assignments/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, canvasUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function deleteAssignment(id: string) {
    await fetch(`/api/assignments/${id}`, { method: "DELETE" });
    setAssignments((p) => p.filter((a) => a.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function toggleComplete(assignment: IAssignment) {
    const res = await fetch(`/api/assignments/${assignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !assignment.completed }),
    });
    const data = await res.json();
    setAssignments((p) => p.map((a) => (a.id === assignment.id ? data.assignment : a)));
  }

  const pending = assignments.filter((a) => !a.completed);
  const done = assignments.filter((a) => a.completed);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setShowAdd((s) => !s)} style={btnStyle("#5B6CFF")}>
          {showAdd ? "Cancel" : "+ Add Assignment"}
        </button>
        <button onClick={syncCanvas} disabled={syncing} style={btnStyle("#9C8CFF", syncing)}>
          {syncing ? "Syncing…" : "Sync from Canvas"}
        </button>
      </div>

      {showAdd && (
        <AddAssignmentForm
          classId={classId}
          onSaved={async (a) => {
            setAssignments((p) => [...p, a]);
            setShowAdd(false);
            setSelected(a);
          }}
        />
      )}

      {error && <ErrorBanner msg={error} />}

      {loading ? (
        <p style={mutedText}>Loading…</p>
      ) : assignments.length === 0 ? (
        <p style={mutedText}>No assignments yet — add one or sync from Canvas.</p>
      ) : (
        <div style={{ display: "flex", gap: 16 }}>
          {/* Left: assignment list */}
          <div style={{ width: 200, flexShrink: 0 }}>
            {pending.length > 0 && (
              <>
                <p style={sectionLabel}>Upcoming</p>
                {pending.map((a) => (
                  <AssignmentRow
                    key={a.id}
                    assignment={a}
                    active={selected?.id === a.id}
                    onClick={() => setSelected(a)}
                    onToggle={toggleComplete}
                    onDelete={deleteAssignment}
                  />
                ))}
              </>
            )}
            {done.length > 0 && (
              <>
                <p style={{ ...sectionLabel, marginTop: 12 }}>Completed</p>
                {done.map((a) => (
                  <AssignmentRow
                    key={a.id}
                    assignment={a}
                    active={selected?.id === a.id}
                    onClick={() => setSelected(a)}
                    onToggle={toggleComplete}
                    onDelete={deleteAssignment}
                  />
                ))}
              </>
            )}
          </div>

          {/* Right: detail panel */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {selected ? (
              <AssignmentDetail
                assignment={selected}
                onUpdated={(updated) => {
                  setAssignments((p) => p.map((a) => (a.id === updated.id ? updated : a)));
                  setSelected(updated);
                }}
              />
            ) : (
              <p style={mutedText}>Select an assignment to see its milestones.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Assignment row in sidebar ────────────────────────────────

function AssignmentRow({
  assignment, active, onClick, onToggle, onDelete,
}: {
  assignment: IAssignment;
  active: boolean;
  onClick: () => void;
  onToggle: (a: IAssignment) => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const days = daysUntil(assignment.dueDate);
  const colors = TYPE_COLORS[assignment.type] ?? FALLBACK_COLOR;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        marginBottom: 3,
        cursor: "pointer",
        background: active ? colors.bg : hovered ? "var(--bg-subtle)" : "transparent",
        border: active ? `1px solid ${colors.text}30` : "1px solid transparent",
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
        <input
          type="checkbox"
          checked={assignment.completed}
          onChange={(e) => { e.stopPropagation(); onToggle(assignment); }}
          style={{ marginTop: 3, accentColor: "#5B6CFF", cursor: "pointer" }}
          onClick={(e) => e.stopPropagation()}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 12, fontWeight: 600,
            color: assignment.completed ? "var(--muted)" : "var(--dark)",
            textDecoration: assignment.completed ? "line-through" : "none",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {assignment.title}
          </p>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: assignment.completed ? "var(--muted)" : urgencyColor(days),
            }}>
              {assignment.completed ? "Done" : days === null ? "No date" : days < 0 ? "Overdue" : days === 0 ? "Today!" : `${days}d`}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700,
              color: colors.text, background: colors.bg,
              padding: "1px 5px", borderRadius: 999, textTransform: "capitalize",
            }}>
              {assignment.type}
            </span>
          </div>
        </div>
        {hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(assignment.id); }}
            style={{ fontSize: 10, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", marginTop: 2 }}
          >
            ✕
          </button>
        )}
      </div>
      {/* Milestone progress bar */}
      {assignment.milestones.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ height: 3, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(assignment.milestones.filter((m) => m.completed).length / assignment.milestones.length) * 100}%`,
              background: "#5B6CFF",
              borderRadius: 999,
              transition: "width 0.3s",
            }} />
          </div>
          <p style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>
            {assignment.milestones.filter((m) => m.completed).length}/{assignment.milestones.length} milestones
          </p>
        </div>
      )}
    </div>
  );
}

// ── Assignment detail + milestone timeline ───────────────────

function AssignmentDetail({
  assignment,
  onUpdated,
}: {
  assignment: IAssignment;
  onUpdated: (a: IAssignment) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);
  const [showContextInput, setShowContextInput] = useState(false);
  const [extraContext, setExtraContext] = useState("");

  const colors = TYPE_COLORS[assignment.type] ?? FALLBACK_COLOR;
  const days = daysUntil(assignment.dueDate);

  async function generateMilestones() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${assignment.id}/generate-milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraContext: extraContext.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdated(data.assignment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function exportCalendar() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${assignment.id}/export-calendar`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("Exported to Google Calendar!");
      onUpdated({ ...assignment, calendarExported: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function toggleMilestone(milestone: IMilestone) {
    const res = await fetch(
      `/api/assignments/${assignment.id}/milestones/${milestone.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !milestone.completed }),
      }
    );
    const data = await res.json();
    onUpdated(data.assignment);
  }

  async function saveMilestoneEdit(milestone: IMilestone, newTitle: string, newDesc: string, newDate: string) {
    const res = await fetch(
      `/api/assignments/${assignment.id}/milestones/${milestone.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, description: newDesc, dueDate: newDate }),
      }
    );
    const data = await res.json();
    onUpdated(data.assignment);
    setEditingMilestone(null);
  }

  const completedMilestones = assignment.milestones.filter((m) => m.completed).length;
  const totalMilestones = assignment.milestones.length;
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  return (
    <div>
      {/* Header */}
      <div style={{
        background: colors.bg,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 16,
        border: `1px solid ${colors.text}25`,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--dark)" }}>
                {assignment.title}
              </h4>
              <span style={{
                fontSize: 10, fontWeight: 700, color: colors.text,
                background: "#fff", padding: "2px 8px", borderRadius: 999,
                textTransform: "capitalize",
              }}>
                {assignment.type}
              </span>
              {assignment.calendarExported && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#45D483",
                  background: "#edfbf3", padding: "2px 8px", borderRadius: 999,
                }}>
                  📅 In Calendar
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
              {assignment.dueDate
                ? <>Due {new Date(assignment.dueDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</>
                : "No due date"}
              {days !== null && <>
                {" · "}
                <span style={{ color: urgencyColor(days), fontWeight: 600 }}>
                  {days < 0 ? "Overdue" : days === 0 ? "Due today!" : `${days} days left`}
                </span>
              </>}
              {assignment.points && ` · ${assignment.points} pts`}
            </p>
            {assignment.description && (
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>
                {assignment.description}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {totalMilestones > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: colors.text }}>
                {completedMilestones}/{totalMilestones} milestones complete
              </p>
              <p style={{ fontSize: 11, fontWeight: 700, color: colors.text }}>
                {Math.round(progress)}%
              </p>
            </div>
            <div style={{ height: 6, background: `${colors.text}25`, borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${progress}%`,
                background: colors.text, borderRadius: 999, transition: "width 0.4s ease",
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ marginBottom: 16 }}>
        {showContextInput && (
          <div style={{ marginBottom: 8 }}>
            <textarea
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              placeholder="Paste the assignment description, rubric, or any details here for more accurate milestones..."
              rows={4}
              style={{
                width: "100%", padding: "8px 10px", fontSize: 12, borderRadius: 8,
                border: "1px solid #d1d5e8", resize: "vertical", fontFamily: "inherit",
                background: "#fafbff", color: "#1f1f2e",
              }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button onClick={generateMilestones} disabled={generating} style={btnStyle("#5B6CFF", generating)}>
                {generating ? "Generating…" : "Generate with context"}
              </button>
              <button
                onClick={() => { setShowContextInput(false); setExtraContext(""); }}
                style={{ ...btnStyle("#6A6A80"), background: "transparent", color: "#6A6A80" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {!showContextInput && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setShowContextInput(true)} disabled={generating} style={btnStyle("#5B6CFF", generating)}>
              {assignment.milestones.length === 0
                ? "✨ Generate milestones with AI"
                : "↻ Regenerate milestones"}
            </button>
            <button onClick={exportCalendar} disabled={exporting} style={btnStyle("#45D483", exporting)}>
              {exporting ? "Exporting…" : assignment.calendarExported ? "📅 Re-export to Calendar" : "📅 Export to Calendar"}
            </button>
          </div>
        )}
      </div>

      {error && <ErrorBanner msg={error} />}
      {success && <SuccessBanner msg={success} />}

      {/* Milestone timeline */}
      {assignment.milestones.length > 0 && (
        <div>
          <p style={sectionLabel}>Milestone timeline</p>
          <div style={{ position: "relative", paddingLeft: 20 }}>
            {/* Vertical line */}
            <div style={{
              position: "absolute", left: 7, top: 8,
              width: 2, height: "calc(100% - 16px)",
              background: "var(--border)", borderRadius: 999,
            }} />

            {assignment.milestones.map((milestone, i) => (
              <MilestoneRow
                key={milestone.id}
                milestone={milestone}
                isLast={i === assignment.milestones.length - 1}
                isEditing={editingMilestone === milestone.id}
                onToggle={toggleMilestone}
                onEdit={() => setEditingMilestone(milestone.id)}
                onSave={saveMilestoneEdit}
                onCancelEdit={() => setEditingMilestone(null)}
              />
            ))}

            {/* Due date node */}
            <div style={{ position: "relative", paddingLeft: 20, paddingBottom: 4 }}>
              <div style={{
                position: "absolute", left: 0, top: 4,
                width: 14, height: 14, borderRadius: "50%",
                background: urgencyColor(days),
                border: "2px solid #fff",
                boxShadow: `0 0 0 2px ${urgencyColor(days)}40`,
              }} />
              <div style={{
                background: `${urgencyColor(days)}15`,
                border: `1px solid ${urgencyColor(days)}30`,
                borderRadius: 8, padding: "8px 12px",
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: urgencyColor(days) }}>
                  📋 FINAL DUE DATE
                </p>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--dark)", marginTop: 2 }}>
                  {assignment.title}
                </p>
                <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                  {assignment.dueDate
                    ? new Date(assignment.dueDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                    : "No due date"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Milestone row ────────────────────────────────────────────

function MilestoneRow({
  milestone, isLast, isEditing, onToggle, onEdit, onSave, onCancelEdit,
}: {
  milestone: IMilestone;
  isLast: boolean;
  isEditing: boolean;
  onToggle: (m: IMilestone) => void;
  onEdit: () => void;
  onSave: (m: IMilestone, title: string, desc: string, date: string) => void;
  onCancelEdit: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [editTitle, setEditTitle] = useState(milestone.title);
  const [editDesc, setEditDesc] = useState(milestone.description);
  const [editDate, setEditDate] = useState(milestone.dueDate.split("T")[0]);
  const days = daysUntil(milestone.dueDate);

  return (
    <div
      style={{ position: "relative", paddingLeft: 20, paddingBottom: 10 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Timeline dot */}
      <div style={{
        position: "absolute", left: 0, top: 10,
        width: 14, height: 14, borderRadius: "50%",
        background: milestone.completed ? "#45D483" : "#fff",
        border: `2px solid ${milestone.completed ? "#45D483" : "#5B6CFF"}`,
        transition: "all 0.2s", zIndex: 1,
      }} />

      {isEditing ? (
        <div style={{
          background: "#fff", border: "1px solid #5B6CFF50",
          borderRadius: 10, padding: "12px 14px",
          boxShadow: "0 2px 12px rgba(91,108,255,0.12)",
        }}>
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
            style={{ ...editInputStyle, fontWeight: 600, marginBottom: 6 }}
            placeholder="Milestone title" />
          <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
            rows={2}
            style={{ ...editInputStyle, resize: "none", marginBottom: 6 }}
            placeholder="Description" />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
              style={{ ...editInputStyle, flex: "none", width: "auto" }} />
            <button onClick={() => onSave(milestone, editTitle, editDesc, editDate)}
              style={btnStyle("#5B6CFF")}>Save</button>
            <button onClick={onCancelEdit}
              style={{ fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          background: milestone.completed ? "#f8fffe" : "#fff",
          border: `1px solid ${milestone.completed ? "#45D48330" : "var(--border)"}`,
          borderRadius: 10, padding: "10px 12px",
          transition: "all 0.15s",
          opacity: milestone.completed ? 0.75 : 1,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <input type="checkbox" checked={milestone.completed}
              onChange={() => onToggle(milestone)}
              style={{ marginTop: 3, accentColor: "#45D483", cursor: "pointer" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <p style={{
                  fontSize: 13, fontWeight: 600,
                  color: milestone.completed ? "var(--muted)" : "var(--dark)",
                  textDecoration: milestone.completed ? "line-through" : "none",
                }}>
                  {milestone.order}. {milestone.title}
                </p>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: milestone.completed ? "var(--muted)" : urgencyColor(days),
                  flexShrink: 0,
                }}>
                  {milestone.completed ? "Done" :
                    days === null ? "" :
                    days < 0 ? "Overdue" :
                    days === 0 ? "Today" :
                    `${days}d`}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, lineHeight: 1.5 }}>
                {milestone.description}
              </p>
              <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
                {new Date(milestone.dueDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </p>
            </div>
            {hovered && !milestone.completed && (
              <button onClick={onEdit}
                style={{ fontSize: 11, color: "#5B6CFF", background: "none", border: "none", cursor: "pointer", flexShrink: 0, fontFamily: "'Poppins', sans-serif" }}>
                Edit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add assignment form ──────────────────────────────────────

function AddAssignmentForm({
  classId,
  onSaved,
}: {
  classId: string;
  onSaved: (a: IAssignment) => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [type, setType] = useState<IAssignment["type"]>("homework");
  const [points, setPoints] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim() || !dueDate) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId, title, dueDate, type,
          points: points ? Number(points) : undefined,
          description: description || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSaved(data.assignment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: "var(--bg-subtle)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "16px", marginBottom: 16,
    }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--dark)", marginBottom: 12 }}>
        New assignment
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input placeholder="Assignment title *" value={title}
          onChange={(e) => setTitle(e.target.value)} style={editInputStyle} />
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <p style={fieldLabel}>Due date *</p>
            <input type="date" value={dueDate}
              onChange={(e) => setDueDate(e.target.value)} style={editInputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={fieldLabel}>Type</p>
            <select value={type} onChange={(e) => setType(e.target.value as IAssignment["type"])}
              style={{ ...editInputStyle, cursor: "pointer" }}>
              {["homework","project","exam","quiz","lab","other"].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div style={{ width: 80 }}>
            <p style={fieldLabel}>Points</p>
            <input type="number" placeholder="100" value={points}
              onChange={(e) => setPoints(e.target.value)} style={editInputStyle} />
          </div>
        </div>
        <textarea placeholder="Description (optional)" value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2} style={{ ...editInputStyle, resize: "none" }} />
        {error && <ErrorBanner msg={error} />}
        <button onClick={save} disabled={saving || !title.trim() || !dueDate}
          style={btnStyle("#5B6CFF", saving || !title.trim() || !dueDate)}>
          {saving ? "Saving…" : "Save assignment"}
        </button>
      </div>
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────

function btnStyle(color: string, disabled = false): React.CSSProperties {
  return {
    padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
    color: "#fff", background: color, border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1, fontFamily: "'Poppins', sans-serif",
    transition: "opacity 0.15s", whiteSpace: "nowrap",
  };
}

const editInputStyle: React.CSSProperties = {
  width: "100%", fontSize: 12, padding: "7px 10px", borderRadius: 8,
  border: "1px solid var(--border)", background: "#fff", color: "var(--dark)",
  fontFamily: "'Poppins', sans-serif", outline: "none", boxSizing: "border-box",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "var(--muted)",
  textTransform: "uppercase", letterSpacing: "0.07em",
  marginBottom: 6,
};

const fieldLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: "var(--muted)",
  marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em",
};

const mutedText: React.CSSProperties = {
  fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "16px 0",
};

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      background: "#fff0f0", border: "1px solid #ffd0d0",
      borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#FF5C5C", marginBottom: 8,
    }}>{msg}</div>
  );
}

function SuccessBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      background: "#edfbf3", border: "1px solid #a0f0c0",
      borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#45D483", marginBottom: 8,
    }}>{msg}</div>
  );
}
