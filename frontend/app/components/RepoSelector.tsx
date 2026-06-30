"use client";

import { useRepo } from "./RepoContext";
import { useTheme } from "./ThemeContext";

function readinessColor(readiness: {
  graphs: boolean;
  computed: boolean;
  enriched: boolean;
}): string {
  if (readiness.graphs) return "bg-emerald-500";
  if (readiness.computed) return "bg-amber-500";
  if (readiness.enriched) return "bg-zinc-400";
  return "bg-zinc-500";
}

export default function RepoSelector() {
  const { repos, selectedSlug, selectRepo, status, listLoading } = useRepo();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="repo-select" className="sr-only">
        Select repository
      </label>
      <select
        id="repo-select"
        value={selectedSlug ?? ""}
        onChange={(e) => {
          const slug = e.target.value;
          if (slug) selectRepo(slug);
        }}
        disabled={listLoading || status === "loading"}
        className={`text-sm rounded-lg border px-3 py-1.5 min-w-[200px] max-w-[280px] truncate cursor-pointer disabled:opacity-50 ${
          isDark
            ? "bg-zinc-800 border-zinc-700 text-zinc-200"
            : "bg-white border-slate-200 text-slate-800"
        }`}
      >
        <option value="">
          {listLoading
            ? "Loading repos…"
            : repos.length === 0
              ? "No repos — run scraper"
              : "Select repository"}
        </option>
        {repos.map((r) => (
          <option key={r.slug} value={r.slug}>
            {r.repo}
          </option>
        ))}
      </select>
      {status === "loading" && (
        <span
          className="inline-block w-4 h-4 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin"
          aria-label="Loading repository"
        />
      )}
      {selectedSlug && repos.length > 0 && (
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${readinessColor(
            repos.find((r) => r.slug === selectedSlug)?.readiness ?? {
              graphs: false,
              computed: false,
              enriched: false,
            }
          )}`}
          title="Readiness"
        />
      )}
    </div>
  );
}
