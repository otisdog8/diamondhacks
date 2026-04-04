"use client";
// ============================================================
// TodoPanel component
// Drop into src/components/extensions/TodoPanel.tsx
// ============================================================
import { useState, useEffect, useCallback } from "react";
import type { ITodo } from "@/lib/extensions/types";

interface Props {
  classId: string;
  className: string;
  canvasUrl: string;
}

export function TodoPanel({ classId, className, canvasUrl }: Props) {
  const [todos, setTodos] = useState<ITodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTodos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/todos");
      const data = await res.json();
      const classTodos = (data.todos as ITodo[]).filter((t) => t.classId === classId);
      setTodos(classTodos);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { loadTodos(); }, [loadTodos]);

  async function syncFromCanvas() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/todos/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, canvasUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function addTodo() {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, title: newTitle, dueDate: newDue || undefined }),
      });
      setNewTitle("");
      setNewDue("");
      await loadTodos();
    } finally {
      setAdding(false);
    }
  }

  async function toggleTodo(todo: ITodo) {
    await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !todo.completed }),
    });
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
    );
  }

  async function deleteTodo(id: string) {
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  const pending = todos.filter((t) => !t.completed);
  const done = todos.filter((t) => t.completed);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Todos — {className}
        </h3>
        <button
          onClick={syncFromCanvas}
          disabled={syncing}
          className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/60 disabled:opacity-50 transition-colors"
        >
          {syncing ? "Syncing…" : "Sync from Canvas"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Add todo */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="New task…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <input
          type="date"
          value={newDue}
          onChange={(e) => setNewDue(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <button
          onClick={addTodo}
          disabled={adding || !newTitle.trim()}
          className="px-3 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          Add
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
      ) : todos.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No todos yet. Add one or sync from Canvas.
        </p>
      ) : (
        <div className="space-y-1">
          {pending.map((todo) => (
            <TodoRow key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
          ))}
          {done.length > 0 && (
            <>
              <p className="text-xs text-gray-400 pt-3 pb-1 font-medium">Completed</p>
              {done.map((todo) => (
                <TodoRow key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TodoRow({
  todo,
  onToggle,
  onDelete,
}: {
  todo: ITodo;
  onToggle: (t: ITodo) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 group px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo)}
        className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm truncate ${
            todo.completed
              ? "line-through text-gray-400"
              : "text-gray-800 dark:text-gray-200"
          }`}
        >
          {todo.title}
        </p>
        {todo.dueDate && (
          <p className="text-xs text-gray-400">
            Due {new Date(todo.dueDate).toLocaleDateString()}
            {todo.source === "canvas" && (
              <span className="ml-2 text-purple-400">Canvas</span>
            )}
          </p>
        )}
      </div>
      <button
        onClick={() => onDelete(todo.id)}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs"
      >
        ✕
      </button>
    </div>
  );
}
