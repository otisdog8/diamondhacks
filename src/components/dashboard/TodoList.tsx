"use client";

import { useState, useEffect, useCallback } from "react";

interface Todo {
  id: string;
  userId: string;
  classId: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  source: "canvas" | "manual";
  createdAt: string;
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/todos");
      if (res.ok) {
        const data = await res.json();
        setTodos(data.todos ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addTodo = async () => {
    const title = input.trim();
    if (!title) return;
    setInput("");
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: "general", title }),
      });
      if (res.ok) {
        const data = await res.json();
        setTodos((prev) => [...prev, data.todo]);
      }
    } catch { /* ignore */ }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !completed } : t));
    try {
      await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
    } catch {
      setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed } : t));
    }
  };

  const deleteTodo = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
  };

  const active = todos.filter((t) => !t.completed);
  const done = todos.filter((t) => t.completed);

  // Sort: items with due dates first (soonest first), then by creation
  active.sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  const formatDue = (d: string) => {
    const date = new Date(d + "T00:00:00");
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
    if (diffDays < 0) return "overdue";
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "tomorrow";
    if (diffDays <= 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <div className="h-20 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 overflow-hidden">
      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">To-Do</p>

      {/* Input */}
      <div className="flex gap-2 mb-4 min-w-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          placeholder="Add a task..."
          className="flex-1 min-w-0 text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B4457]/30 transition"
        />
        <button
          onClick={addTodo}
          disabled={!input.trim()}
          className="px-3 py-2 text-sm rounded-xl bg-[#1B4457]/10 text-[#1B4457] dark:text-sky-300 font-semibold hover:bg-[#1B4457]/20 disabled:opacity-30 transition"
        >
          Add
        </button>
      </div>

      {active.length === 0 && done.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">
          No tasks yet. Generate milestones from an assignment or add one manually.
        </p>
      )}

      <div className="space-y-1">
        {active.map((todo) => (
          <div key={todo.id} className="flex items-start gap-2.5 group px-1 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
            <button
              onClick={() => toggleTodo(todo.id, todo.completed)}
              className="mt-0.5 w-4 h-4 rounded border border-gray-300 dark:border-gray-600 shrink-0 hover:border-[#1B4457] transition flex items-center justify-center bg-white dark:bg-gray-800"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{todo.title}</p>
              {todo.description && (
                <p className="text-xs text-gray-400 truncate mt-0.5">{todo.description}</p>
              )}
            </div>
            {todo.dueDate && (
              <span className={`text-xs shrink-0 mt-0.5 ${
                formatDue(todo.dueDate) === "overdue"
                  ? "text-red-500 font-semibold"
                  : formatDue(todo.dueDate) === "today"
                  ? "text-orange-500 font-semibold"
                  : "text-gray-400"
              }`}>
                {formatDue(todo.dueDate)}
              </span>
            )}
            <button
              onClick={() => deleteTodo(todo.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 text-xs transition mt-0.5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {done.length > 0 && (
        <details className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition">
            {done.length} completed
          </summary>
          <div className="space-y-1 mt-2">
            {done.map((todo) => (
              <div key={todo.id} className="flex items-center gap-2.5 group px-1 py-1 rounded-xl">
                <button
                  onClick={() => toggleTodo(todo.id, todo.completed)}
                  className="w-4 h-4 rounded border border-green-300 bg-green-400 shrink-0 flex items-center justify-center"
                >
                  <span className="text-white text-[9px] leading-none">✓</span>
                </button>
                <span className="flex-1 text-sm text-gray-400 line-through truncate">{todo.title}</span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 text-xs transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
