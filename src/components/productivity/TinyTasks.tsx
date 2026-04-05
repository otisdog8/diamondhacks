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
          <div key={task.id} className="flex items-center gap-2.5 group px-1 py-1 rounded-lg hover:bg-[#F5F6F8] dark:hover:bg-[#22263A] transition">
            <button
              onClick={() => toggleTask(task.id)}
              className="w-4 h-4 rounded border border-[#D3D3D3] dark:border-[#2E3347] shrink-0 hover:border-blue-500 transition flex items-center justify-center bg-white dark:bg-[#22263A]"
            />
            <span className="flex-1 text-sm text-[#464646] dark:text-[#C8C8C8]">{task.text}</span>
            {task.estimateMins && (
              <span className="text-xs text-[#8F8F8F] shrink-0">{task.estimateMins}m</span>
            )}
            <button
              onClick={() => removeTask(task.id)}
              className="opacity-0 group-hover:opacity-100 text-[#C8C8C8] hover:text-[#8F8F8F] text-xs transition"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {done.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#EBEBEB] dark:border-[#1E2235] space-y-1.5">
          {done.map((task) => (
            <div key={task.id} className="flex items-center gap-2.5 group px-1 py-1 rounded-lg">
              <button
                onClick={() => toggleTask(task.id)}
                className="w-4 h-4 rounded border border-blue-400 bg-blue-500 shrink-0 flex items-center justify-center"
              >
                <span className="text-white text-[9px] leading-none">✓</span>
              </button>
              <span className="flex-1 text-sm text-[#C8C8C8] line-through">{task.text}</span>
              <button
                onClick={() => removeTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-[#C8C8C8] hover:text-[#8F8F8F] text-xs transition"
              >
                ✕
              </button>
            </div>
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
