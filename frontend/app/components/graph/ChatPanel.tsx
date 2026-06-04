"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "../ThemeContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  highlightNodeIds?: string[];
}

interface ChatPanelProps {
  onHighlight: (ids: Set<string> | null) => void;
  onSelectNode?: (id: string) => void;
}

export default function ChatPanel({
  onHighlight,
  onSelectNode,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Request failed");

      const assistantMsg: Message = {
        role: "assistant",
        content: data.answer,
        highlightNodeIds: data.highlightNodeIds,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.highlightNodeIds?.length > 0) {
        onHighlight(new Set(data.highlightNodeIds));
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
    onHighlight(null);
  }

  return (
    <div
      className={
        isDark
          ? "h-full w-80 flex flex-col flex-shrink-0 border-l border-zinc-700/60"
          : "h-full w-80 flex flex-col flex-shrink-0 border-l border-slate-200 bg-slate-50"
      }
      style={isDark ? { backgroundColor: "#1a1a1f" } : undefined}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          isDark ? "border-zinc-700/60" : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full animate-pulse ${
              isDark ? "bg-indigo-400" : "bg-blue-500"
            }`}
          />
          <span
            className={`text-sm font-semibold tracking-tight ${
              isDark ? "text-zinc-200" : "text-slate-800"
            }`}
          >
            Onboarding Buddy
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className={`text-xs px-2 py-1 rounded-md transition-colors cursor-pointer ${
              isDark
                ? "text-zinc-500 hover:text-zinc-300"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            }`}
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
      >
        {messages.length === 0 && !loading && (
          <div className="text-center py-8 space-y-3">
            <p
              className={`text-sm font-medium ${
                isDark ? "text-zinc-400" : "text-slate-700"
              }`}
            >
              Ask about the org
            </p>
            <div
              className={`space-y-1.5 text-xs ${
                isDark ? "text-zinc-500" : "text-slate-400"
              }`}
            >
              <p>&ldquo;Who&rsquo;s working on billing-v2?&rdquo;</p>
              <p>&ldquo;Who is an expert in Kubernetes?&rdquo;</p>
              <p>&ldquo;What is the auth-refactor about?&rdquo;</p>
            </div>
            <div
              className={`mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium tracking-wide ${
                isDark
                  ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/25"
                  : "bg-blue-50 text-blue-600 ring-1 ring-blue-200"
              }`}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              Powered by K2 Think V2
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] text-sm leading-relaxed ${
                msg.role === "user"
                  ? isDark
                    ? "bg-indigo-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2.5"
                    : "bg-blue-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2.5"
                  : isDark
                    ? `bg-zinc-700/70 text-zinc-200 rounded-2xl rounded-bl-sm px-3.5 py-2.5 ${
                        msg.highlightNodeIds?.length
                          ? "cursor-pointer hover:bg-zinc-600/70 transition-colors"
                          : ""
                      }`
                    : `bg-white text-slate-800 border border-slate-200 shadow-sm rounded-2xl rounded-bl-sm px-3.5 py-2.5 ${
                        msg.highlightNodeIds?.length
                          ? "cursor-pointer hover:border-blue-300 transition-colors"
                          : ""
                      }`
              }`}
              onClick={() => {
                if (msg.role === "assistant" && msg.highlightNodeIds?.length) {
                  onHighlight(new Set(msg.highlightNodeIds));
                }
              }}
            >
              {msg.content}
              {msg.highlightNodeIds && msg.highlightNodeIds.length > 0 && (
                <div
                  className={`mt-2 pt-2 border-t flex flex-wrap gap-1 ${
                    isDark ? "border-zinc-600/50" : "border-slate-100"
                  }`}
                >
                  {msg.highlightNodeIds.map((id) => (
                    <button
                      key={id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode?.(id);
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors cursor-pointer font-medium ${
                        isDark
                          ? "bg-indigo-500/30 text-indigo-300 hover:bg-indigo-500/50"
                          : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
                      }`}
                    >
                      {id.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className={`rounded-2xl rounded-bl-sm px-4 py-3 text-sm ${
                isDark
                  ? "bg-zinc-700/70 text-zinc-400"
                  : "bg-white border border-slate-200 shadow-sm text-slate-400"
              }`}
            >
              <span className="inline-flex gap-1">
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "0ms" }}
                >
                  •
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "150ms" }}
                >
                  •
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "300ms" }}
                >
                  •
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className={`px-3 pb-3 pt-2 border-t ${
          isDark ? "border-zinc-700/40" : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask a question..."
            disabled={loading}
            className={`flex-1 text-sm rounded-xl px-3 py-2 focus:outline-none transition-all disabled:opacity-50 ${
              isDark
                ? "bg-zinc-700/60 text-zinc-200 placeholder:text-zinc-500 border border-zinc-600/50 focus:border-indigo-500/50"
                : "bg-slate-50 text-slate-800 placeholder:text-slate-400 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            }`}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className={`text-white rounded-xl px-3 py-2 transition-colors cursor-pointer shadow-sm disabled:opacity-40 ${
              isDark
                ? "bg-indigo-600 hover:bg-indigo-500 disabled:hover:bg-indigo-600"
                : "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:hover:bg-blue-600"
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
