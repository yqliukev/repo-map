"use client";

import { useState, useEffect } from "react";
import { Node, RankedConnection, TEAM_COLORS } from "./types";
import { useTheme } from "../ThemeContext";

// ── Role badge styles ─────────────────────────────────────────────────────────

const ROLE_STYLES_DARK: Record<string, { bg: string; text: string }> = {
  lead: { bg: "bg-indigo-500/20", text: "text-indigo-300" },
  core: { bg: "bg-emerald-500/20", text: "text-emerald-300" },
  contributor: { bg: "bg-zinc-600/50", text: "text-zinc-400" },
  peripheral: { bg: "bg-zinc-700/50", text: "text-zinc-500" },
};

const ROLE_STYLES_LIGHT: Record<string, { bg: string; text: string }> = {
  lead: { bg: "bg-indigo-50", text: "text-indigo-600" },
  core: { bg: "bg-emerald-50", text: "text-emerald-700" },
  contributor: { bg: "bg-slate-100", text: "text-slate-600" },
  peripheral: { bg: "bg-slate-50", text: "text-slate-400" },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "skills" | "projects" | "network";

const TABS: { id: Tab; label: string }[] = [
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "network", label: "Working With" },
];

interface InfoPanelProps {
  node: Node;
  connections: RankedConnection[];
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InfoPanel({
  node,
  connections,
  onClose,
}: InfoPanelProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState<Tab>("skills");

  // Reset to Skills tab whenever the selected person changes
  useEffect(() => {
    setActiveTab("skills");
  }, [node.id]);

  const ROLE_STYLES = isDark ? ROLE_STYLES_DARK : ROLE_STYLES_LIGHT;
  function roleStyle(role: string) {
    return ROLE_STYLES[role.toLowerCase()] ?? ROLE_STYLES.contributor;
  }

  const projectRoleEntries = node.project_roles
    ? Object.entries(node.project_roles).sort(
        (a, b) => b[1].weight - a[1].weight,
      )
    : [];
  const hasProjectRoles = projectRoleEntries.length > 0;

  return (
    <div
      className={`absolute top-18 left-4 z-20 rounded-xl px-5 py-4 text-sm w-76 max-h-[80vh] overflow-y-auto shadow-xl ${
        isDark
          ? "bg-zinc-800/90 backdrop-blur-sm ring-1 ring-white/5 text-zinc-200"
          : "bg-white border border-slate-200 text-slate-800"
      }`}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className={`font-semibold text-base leading-tight ${isDark ? "text-zinc-100" : "text-slate-900"}`}
          >
            {node.name}
          </div>
          <div
            className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-slate-500"}`}
          >
            {node.role}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: TEAM_COLORS[node.team] || "#94a3b8" }}
            />
            <span
              className={`capitalize text-xs ${isDark ? "text-zinc-400" : "text-slate-500"}`}
            >
              {node.team}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 mt-0.5 cursor-pointer ${
            isDark
              ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700"
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          }`}
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1l12 12M13 1L1 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────── */}
      <div
        className={`flex rounded-lg p-0.5 mt-4 ${isDark ? "bg-zinc-700/50" : "bg-slate-100"}`}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-[11px] py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === tab.id
                ? isDark
                  ? "bg-zinc-600 text-zinc-100 shadow-sm"
                  : "bg-white text-slate-800 shadow-sm"
                : isDark
                  ? "text-zinc-400 hover:text-zinc-200"
                  : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────── */}
      <div className="mt-4 space-y-4">
        {/* Skills tab — summary + expertise ──────────────────────── */}
        {activeTab === "skills" && (
          <>
            {node.skills_summary && (
              <div>
                <SectionLabel isDark={isDark}>Summary</SectionLabel>
                <p
                  className={`text-xs leading-relaxed mt-1 ${isDark ? "text-zinc-300" : "text-slate-600"}`}
                >
                  {node.skills_summary}
                </p>
              </div>
            )}

            {node.expertise.length > 0 && (
              <div>
                <SectionLabel isDark={isDark}>Expertise</SectionLabel>
                <div className="flex flex-wrap gap-1 mt-1">
                  {node.expertise.map((e) => (
                    <span
                      key={e}
                      className={`px-2 py-0.5 rounded text-xs ${
                        isDark
                          ? "bg-zinc-700 text-zinc-300"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!node.skills_summary && node.expertise.length === 0 && (
              <p
                className={`text-xs ${isDark ? "text-zinc-500" : "text-slate-400"}`}
              >
                No skills data available.
              </p>
            )}
          </>
        )}

        {/* Projects tab ───────────────────────────────────────────── */}
        {activeTab === "projects" && (
          <>
            {hasProjectRoles ? (
              <div className="space-y-2.5">
                {projectRoleEntries.map(([projId, { weight, role }]) => {
                  const { bg, text } = roleStyle(role);
                  const pct = Math.round(weight * 100);
                  return (
                    <div key={projId}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`truncate text-xs capitalize ${isDark ? "text-zinc-200" : "text-slate-700"}`}
                        >
                          {projId.replace(/-/g, " ")}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize flex-shrink-0 font-medium ${bg} ${text}`}
                        >
                          {role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex-1 h-1 rounded-full overflow-hidden ${isDark ? "bg-zinc-700" : "bg-slate-200"}`}
                        >
                          <div
                            className={`h-full rounded-full transition-all ${isDark ? "bg-zinc-400" : "bg-blue-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span
                          className={`text-[10px] tabular-nums w-7 text-right ${isDark ? "text-zinc-500" : "text-slate-400"}`}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : node.projects.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {node.projects.map((p) => (
                  <span
                    key={p}
                    className={`px-2 py-0.5 rounded text-xs ${
                      isDark
                        ? "bg-zinc-700/70 text-zinc-300"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <p
                className={`text-xs ${isDark ? "text-zinc-500" : "text-slate-400"}`}
              >
                No project data available.
              </p>
            )}
          </>
        )}

        {/* Working With tab — work summary + collaborators ────────── */}
        {activeTab === "network" && (
          <>
            {node.work_summary && (
              <div>
                <SectionLabel isDark={isDark}>Summary</SectionLabel>
                <p
                  className={`text-xs leading-relaxed mt-1 ${isDark ? "text-zinc-300" : "text-slate-600"}`}
                >
                  {node.work_summary}
                </p>
              </div>
            )}

            {connections.length > 0 && (
              <div>
                <SectionLabel isDark={isDark}>
                  Closest Collaborators
                </SectionLabel>
                <div className="space-y-1.5 mt-1">
                  {connections.slice(0, 8).map((c, i) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <span
                        className={`text-xs w-4 text-right tabular-nums ${isDark ? "text-zinc-600" : "text-slate-300"}`}
                      >
                        {i + 1}.
                      </span>
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: TEAM_COLORS[c.team] || "#94a3b8",
                        }}
                      />
                      <span
                        className={`flex-1 truncate ${isDark ? "text-zinc-300" : "text-slate-700"}`}
                      >
                        {c.name}
                      </span>
                      <span
                        className={`text-xs tabular-nums ${isDark ? "text-zinc-500" : "text-slate-400"}`}
                      >
                        {(c.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!node.work_summary && connections.length === 0 && (
              <p
                className={`text-xs ${isDark ? "text-zinc-500" : "text-slate-400"}`}
              >
                No collaboration data available.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionLabel({
  children,
  isDark,
}: {
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <div
      className={`text-[10px] font-semibold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}
    >
      {children}
    </div>
  );
}
