"use client";

import type { TechnologyGroup } from "@/lib/skills";
import { useTheme } from "./ThemeContext";

interface TechnologySidebarProps {
  title: string;
  groups: TechnologyGroup[];
  onClose: () => void;
}

export default function TechnologySidebar({
  title,
  groups,
  onClose,
}: TechnologySidebarProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <aside
      className={`w-72 shrink-0 border-l flex flex-col overflow-hidden ${
        isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
      }`}
    >
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          isDark ? "border-zinc-800" : "border-slate-200"
        }`}
      >
        <h2
          className={`text-sm font-medium truncate pr-2 ${
            isDark ? "text-zinc-100" : "text-slate-900"
          }`}
        >
          {title}
        </h2>
        <button
          onClick={onClose}
          className={`shrink-0 w-7 h-7 rounded flex items-center justify-center cursor-pointer ${
            isDark
              ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          }`}
          aria-label="Close sidebar"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {groups.length === 0 ? (
          <p className={`text-sm ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
            No technology data for this node.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.title}>
              <h3
                className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
                  isDark ? "text-zinc-400" : "text-slate-500"
                }`}
              >
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className={`flex items-center justify-between text-sm ${
                      isDark ? "text-zinc-200" : "text-slate-800"
                    }`}
                  >
                    <span className="truncate pr-2">{item.label}</span>
                    <span
                      className={`text-xs shrink-0 ${
                        isDark ? "text-zinc-500" : "text-slate-400"
                      }`}
                    >
                      {item.weight.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
