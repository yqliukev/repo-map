"use client";

import type { ReactNode } from "react";
import { useTheme } from "./ThemeContext";

export type GraphTab = "contributors" | "projects";

interface GraphTabsProps {
  activeTab: GraphTab;
  onTabChange: (tab: GraphTab) => void;
  children: ReactNode;
}

export default function GraphTabs({
  activeTab,
  onTabChange,
  children,
}: GraphTabsProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const tabs: { id: GraphTab; label: string }[] = [
    { id: "contributors", label: "Contributors" },
    { id: "projects", label: "Projects" },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        className={`flex gap-1 px-4 py-2 border-b shrink-0 ${
          isDark ? "border-zinc-800 bg-zinc-950" : "border-slate-200 bg-slate-50"
        }`}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${
              activeTab === tab.id
                ? isDark
                  ? "bg-zinc-800 text-zinc-100"
                  : "bg-white text-slate-900 shadow-sm"
                : isDark
                  ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex flex-1 min-h-0">{children}</div>
    </div>
  );
}
