"use client";

import { useTheme } from "../ThemeContext";

export type ViewMode = "people" | "projects";

interface ViewSwitcherProps {
  active: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const VIEWS: { id: ViewMode; label: string; description: string }[] = [
  { id: "people", label: "People", description: "Who talks to who" },
  { id: "projects", label: "Projects", description: "Shared contributors" },
];

export default function ViewSwitcher({ active, onChange }: ViewSwitcherProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`rounded-xl p-1 flex gap-1 shadow-lg ${
        isDark
          ? "bg-zinc-800/95 ring-1 ring-white/10"
          : "bg-white border border-slate-200 shadow-lg"
      }`}
    >
      {VIEWS.map((v) => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            active === v.id
              ? isDark
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-blue-600 text-white shadow-md"
              : isDark
                ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
          title={v.description}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
