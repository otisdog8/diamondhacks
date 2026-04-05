"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  action?: Record<string, unknown> | null;
  applied?: boolean;
}

interface ScheduleChatProps {
  onClassUpdated?: () => void;
}

export function ScheduleChat({ onClassUpdated }: ScheduleChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/classes/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply || data.error || "Something went wrong.",
          action: data.action,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Failed to reach the server. Try again." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const applyAction = async (msgIdx: number) => {
    const msg = messages[msgIdx];
    if (!msg.action) return;

    setApplying(`${msgIdx}`);
    try {
      const res = await fetch("/api/classes/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: msg.action }),
      });

      if (res.ok) {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === msgIdx ? { ...m, applied: true } : m
          )
        );
        onClassUpdated?.();
      } else {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `Failed to apply: ${data.error}` },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Failed to apply changes." },
      ]);
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden flex flex-col" style={{ maxHeight: 420 }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Schedule Editor
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          Try: &quot;Cancel Monday OH&quot;, &quot;Move lecture to CENTR 101&quot;, &quot;Mark essay as done&quot;, &quot;Add a todo for Friday&quot;
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[120px]">
        {messages.length === 0 && (
          <p className="text-xs text-gray-300 dark:text-gray-600 text-center py-6">
            Type a message to edit your schedule
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-[#1B4457] text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {/* Confirm/reject buttons for actions */}
              {msg.role === "assistant" && msg.action && !msg.applied && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                  <button
                    onClick={() => applyAction(i)}
                    disabled={applying === `${i}`}
                    className="text-xs font-semibold text-green-600 hover:text-green-700 disabled:opacity-50"
                  >
                    {applying === `${i}` ? "Applying..." : "Apply"}
                  </button>
                  <button
                    onClick={() =>
                      setMessages((prev) =>
                        prev.map((m, idx) =>
                          idx === i ? { ...m, action: null } : m
                        )
                      )
                    }
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {msg.applied && (
                <p className="text-xs text-green-500 mt-1 pt-1 border-t border-gray-200/50 dark:border-gray-700/50">
                  Applied
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
              <span className="text-xs text-gray-400">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2.5 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Edit your schedule..."
          disabled={loading}
          className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#1B4457] disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1B4457] text-white hover:bg-[#163847] disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
