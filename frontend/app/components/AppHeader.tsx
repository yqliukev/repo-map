"use client";

import { useTheme } from "./ThemeContext";
import ViewSwitcher, { ViewMode } from "./graph/ViewSwitcher";
import SearchBar from "./graph/SearchBar";

interface AppHeaderProps {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  onLogoClick: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  matchCount: number | null;
}

export default function AppHeader({
  view,
  onViewChange,
  onLogoClick,
  search,
  onSearchChange,
  matchCount,
}: AppHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header
      className={`relative h-24 shrink-0 z-30 border-b ${
        isDark
          ? "bg-zinc-900 border-zinc-800"
          : "bg-white border-slate-200 shadow-sm"
      }`}
    >
      {/* ViewSwitcher — original top-left position */}
      <div className="absolute top-4 left-4 z-10">
        <ViewSwitcher active={view} onChange={onViewChange} />
      </div>

      {/* Logo — original top-center position, large */}
      <img
        src="/hoponboard.png"
        alt="HopOnBoard"
        onClick={onLogoClick}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-20 object-contain cursor-pointer select-none opacity-90 hover:opacity-100 transition-opacity"
      />

      {/* Right side — SearchBar + theme toggle */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 flex items-center gap-2">
        {view === "people" && (
          <SearchBar
            search={search}
            setSearch={onSearchChange}
            matchCount={matchCount}
          />
        )}

        <button
          onClick={toggleTheme}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
            isDark
              ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          }`}
          aria-label="Toggle theme"
        >
          {isDark ? (
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
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
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
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
