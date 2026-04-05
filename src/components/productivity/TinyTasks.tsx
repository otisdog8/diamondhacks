"use client";

import { useState, useRef, useEffect } from "react";
import type { ClassEvent } from "./types";
import type { TimeSuggestion } from "@/hooks/useTaskSuggestions";
import { useTaskSuggestions } from "@/hooks/useTaskSuggestions";
import { SuggestedTimeBlocks } from "./SuggestedTimeBlocks";

interface Task {
  id: string;
  text: string;
  estimateMins?: number;
  done: boolean;
  scheduled?: TimeSuggestion;
}

function parseTask(raw: string): { text: string; estimateMins?: number } {
  const match = raw.trim().match(/^(.+?)\s*\((\d+)m?\)\s*$/);
  if (match) return { text: match[1].trim(), estimateMins: parseInt(match[2]) };
  return { text: raw.trim() };
}

function fmt(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Per-task row — needs its own hook call for suggestions
function TaskRow({
  task,
  events,
  now,
  onToggle,
  onRemove,
  onSchedule,
}: {
  task: Task;
  events: ClassEvent[];
  now: Date;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onSchedule: (id: string, s: TimeSuggestion) => void;
}) {
  const suggestions = useTaskSuggestions(events, task.estimateMins, now);
  const [selectedId, setSelectedId] = useState<string | undefined>(
    task.scheduled?.id,
  );

  const isSmallTask = !!task.estimateMins && task.estimateMins <= 30;
  const showSuggestions = isSmallTask && !task.done && !task.scheduled && suggestions.length > 0;

  function handleSelect(s: TimeSuggestion) {
    setSelectedId(s.id);
    onSchedule(task.id, s);
  }

  return (
    <div className="rounded-xl transition-all duration-200">
      {/* Main row */}
      <div className="flex items-center gap-2.5 group px-1 py-1 rounded-xl hover:bg-white/60 transition">
        <button
          onClick={() => onToggle(task.id)}
          className={[
            "w-4 h-4 rounded border shrink-0 transition flex items-center justify-center",
            task.done
              ? "border-sky-300 bg-sky-300"
              : "border-gray-300 hover:border-[#1B4457] bg-white/80",
          ].join(" ")}
        >
          {task.done && <span className="text-white text-[9px] leading-none">✓</span>}
        </button>

        <span
          className={`flex-1 text-sm ${
            task.done ? "text-gray-400 line-through" : "text-gray-700"
          }`}
        >
          {task.text}
        </span>

        {task.estimateMins && !task.done && !task.scheduled && (
          <span className="text-xs text-gray-400 shrink-0">{task.estimateMins}m</span>
        )}

        {task.scheduled && !task.done && (
          <span className="text-[10px] text-sky-500 font-medium shrink-0 bg-sky-50 px-1.5 py-0.5 rounded-full border border-sky-200">
            {fmt(task.scheduled.start)}
          </span>
        )}

        <button
          onClick={() => onRemove(task.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 text-xs transition"
        >
          ✕
        </button>
      </div>

      {/* Scheduled confirmation */}
      {task.scheduled && !task.done && (
        <div className="ml-[26px] mb-1 text-[10px] text-sky-400">
          {task.scheduled.label} · {fmt(task.scheduled.start)} – {fmt(task.scheduled.end)}
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && (
        <SuggestedTimeBlocks
          suggestions={suggestions}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}

interface TinyTasksProps {
  events?: ClassEvent[];
}

export function TinyTasks({ events = [] }: TinyTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [now, setNow] = useState(() => new Date());
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep "now" fresh so suggestions stay accurate
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const addTask = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const { text, estimateMins } = parseTask(trimmed);
    setTasks((prev) => [
      ...prev,
      { id: Date.now().toString(), text, estimateMins, done: false },
    ]);
    setInput("");
    inputRef.current?.focus();
  };

  const toggleTask = (id: string) =>
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const removeTask = (id: string) =>
    setTasks((p) => p.filter((t) => t.id !== id));

  const scheduleTask = (id: string, s: TimeSuggestion) =>
    setTasks((p) =>
      p.map((t) => (t.id === id ? { ...t, scheduled: s } : t)),
    );

  const active = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="bg-white dark:bg-[#1A1D27] border border-[#EBEBEB] dark:border-[#1E2235] rounded-xl p-5 shadow-sm">
      <p className="text-sm font-semibold text-[#000000] dark:text-[#F5F6F8] mb-3">Tiny Tasks</p>

      {/* Input */}
      <div className="flex gap-2 mb-4">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task… (15m)"
          className="flex-1 text-sm px-3 py-2 rounded-lg border border-[#D3D3D3] dark:border-[#2E3347] bg-white dark:bg-[#1A1D27] text-[#000000] dark:text-[#F5F6F8] placeholder-[#C8C8C8] dark:placeholder-[#464646] focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <button
          onClick={addTask}
          disabled={!input.trim()}
          className="px-3 py-2 text-sm rounded-lg bg-[#EBF3FF] dark:bg-[#1E3A5F] text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-100 dark:hover:bg-[#1E3A6F] disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          Add
        </button>
      </div>

      {active.length === 0 && done.length === 0 && (
        <p className="text-sm text-[#8F8F8F] text-center py-2">Nothing yet — add something quick</p>
      )}

      <div className="space-y-1.5">
        {active.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            events={events}
            now={now}
            onToggle={toggleTask}
            onRemove={removeTask}
            onSchedule={scheduleTask}
          />
        ))}
      </div>

      {done.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#EBEBEB] dark:border-[#1E2235] space-y-1.5">
          {done.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              events={events}
              now={now}
              onToggle={toggleTask}
              onRemove={removeTask}
              onSchedule={scheduleTask}
            />
          ))}
          <button
            onClick={() => setTasks((p) => p.filter((t) => !t.done))}
            className="text-xs text-[#8F8F8F] hover:text-[#464646] dark:hover:text-[#C8C8C8] mt-1 transition"
          >
            Clear completed
          </button>
        </div>
      )}
    </div>
  );
}
