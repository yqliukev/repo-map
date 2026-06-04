"use client";

import { useState } from "react";
import { useTheme } from "../ThemeContext";

interface SettingsPanelProps {
  minWeight: number;
  setMinWeight: (value: number) => void;
  showEdges: boolean;
  setShowEdges: (value: boolean) => void;
  clustering: boolean;
  setClustering: (value: boolean) => void;
}

function Toggle({
  value,
  onChange,
  isDark,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  isDark: boolean;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 ${
        value ? "bg-blue-600" : isDark ? "bg-zinc-600" : "bg-slate-200"
      }`}
      role="switch"
      aria-checked={value}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
          value ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function SettingsPanel({
  minWeight,
  setMinWeight,
  showEdges,
  setShowEdges,
  clustering,
  setClustering,
}: SettingsPanelProps) {
  const [open, setOpen] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`rounded-xl text-sm w-64 ${
        isDark
          ? "bg-zinc-800/90 text-zinc-300"
          : "bg-white border border-slate-200 shadow-md text-slate-700"
      }`}
    >
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-2.5 cursor-pointer rounded-xl transition-colors ${
          isDark ? "hover:bg-zinc-700/50" : "hover:bg-slate-50"
        }`}
      >
        <span
          className={`font-semibold tracking-tight ${
            isDark ? "text-zinc-200" : "text-slate-700"
          }`}
        >
          Settings
        </span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          } ${isDark ? "text-zinc-500" : "text-slate-400"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className={`px-4 pb-4 space-y-4 border-t pt-3 ${
            isDark ? "border-zinc-700/50" : "border-slate-100"
          }`}
        >
          {/* Edge weight threshold */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className={`text-xs font-medium ${
                  isDark ? "text-zinc-400" : "text-slate-500"
                }`}
              >
                Edge weight threshold
              </label>
              <span
                className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded ${
                  isDark
                    ? "text-zinc-400 bg-zinc-700/60"
                    : "text-slate-400 bg-slate-100"
                }`}
              >
                {minWeight.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={0.8}
              step={0.01}
              value={minWeight}
              onChange={(e) => setMinWeight(parseFloat(e.target.value))}
              className={`w-full h-1.5 cursor-pointer rounded-full ${
                isDark ? "accent-zinc-400" : "accent-blue-600"
              }`}
            />
            <div
              className={`flex justify-between text-[10px] mt-1 ${
                isDark ? "text-zinc-600" : "text-slate-300"
              }`}
            >
              <span>More edges</span>
              <span>Fewer edges</span>
            </div>
          </div>

          {/* Show edges toggle */}
          <div className="flex items-center justify-between">
            <label
              className={`text-xs font-medium ${
                isDark ? "text-zinc-400" : "text-slate-500"
              }`}
            >
              Show edges
            </label>
            <Toggle value={showEdges} onChange={setShowEdges} isDark={isDark} />
          </div>

          {/* Project clusters toggle */}
          <div className="flex items-center justify-between">
            <label
              className={`text-xs font-medium ${
                isDark ? "text-zinc-400" : "text-slate-500"
              }`}
            >
              Project clusters
            </label>
            <Toggle
              value={clustering}
              onChange={setClustering}
              isDark={isDark}
            />
          </div>
        </div>
      )}
    </div>
  );
}
