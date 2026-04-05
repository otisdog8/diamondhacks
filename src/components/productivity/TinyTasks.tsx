"use client";

import { useState, useRef } from "react";

interface Task {
  id: string;
  text: string;
  estimateMins?: number;
  done: boolean;
}

function parseTask(raw: string): { text: string; estimateMins?: number } {
  const match = raw.trim().match(/^(.+?)\s*\((\d+)m?\)\s*$/);
  if (match) return { text: match[1].trim(), estimateMins: parseInt(match[2]) };
  return { text: raw.trim() };
}

export function TinyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput]  = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTask = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const { text, estimateMins } = parseTask(trimmed);
    setTasks((prev) => [...prev, { id: Date.now().toString(), text, estimateMins, done: false }]);
    setInput("");
    inputRef.current?.focus();
  };

  const toggleTask  = (id: string) => setTasks((p) => p.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  const removeTask  = (id: string) => setTasks((p) => p.filter((t) => t.id !== id));

  const active = tasks.filter((t) => !t.done);
  const done   = tasks.filter((t) => t.done);

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-sm font-semibold text-gray-900 mb-3">Tiny Tasks</p>

      {/* Input */}
      <div className="flex gap-2 mb-4">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task… (15m)"
          className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 bg-white/80 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-200 transition"
        />
        <button
          onClick={addTask}
          disabled={!input.trim()}
          className="px-3 py-2 text-sm rounded-xl bg-[#1B4457]/10 text-[#1B4457] font-semibold hover:bg-[#1B4457]/20 disabled:opacity-30 transition"
        >
          Add
        </button>
      </div>

      {active.length === 0 && done.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">Nothing yet — add something quick</p>
      )}

      <div className="space-y-1.5">
        {active.map((task) => (
          <div key={task.id} className="flex items-center gap-2.5 group px-1 py-1 rounded-xl hover:bg-white/60 transition">
            <button
              onClick={() => toggleTask(task.id)}
              className="w-4 h-4 rounded border border-gray-300 shrink-0 hover:border-[#1B4457] transition flex items-center justify-center bg-white/80"
            />
            <span className="flex-1 text-sm text-gray-700">{task.text}</span>
            {task.estimateMins && (
              <span className="text-xs text-gray-400 shrink-0">{task.estimateMins}m</span>
            )}
            <button
              onClick={() => removeTask(task.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 text-xs transition"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {done.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200/60 space-y-1.5">
          {done.map((task) => (
            <div key={task.id} className="flex items-center gap-2.5 group px-1 py-1 rounded-xl">
              <button
                onClick={() => toggleTask(task.id)}
                className="w-4 h-4 rounded border border-sky-300 bg-sky-300 shrink-0 flex items-center justify-center"
              >
                <span className="text-white text-[9px] leading-none">✓</span>
              </button>
              <span className="flex-1 text-sm text-gray-400 line-through">{task.text}</span>
              <button
                onClick={() => removeTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 text-xs transition"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => setTasks((p) => p.filter((t) => !t.done))}
            className="text-xs text-gray-400 hover:text-gray-600 mt-1 transition"
          >
            Clear completed
          </button>
        </div>
      )}
    </div>
  );
}
