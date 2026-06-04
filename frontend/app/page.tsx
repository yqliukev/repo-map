"use client";

import { useState, useCallback, useRef } from "react";
import OrgGraph from "./components/OrgGraph";
import ProjectGraph from "./components/ProjectGraph";
import AppHeader from "./components/AppHeader";
import { ViewMode } from "./components/graph/ViewSwitcher";
import ChatPanel from "./components/graph/ChatPanel";
import { ThemeProvider } from "./components/ThemeContext";

export default function Home() {
  const [view, setView] = useState<ViewMode>("people");
  const [search, setSearch] = useState("");
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [chatHighlight, setChatHighlight] = useState<Set<string> | null>(null);
  const selectNodeRef = useRef<((id: string) => void) | null>(null);

  const handleHighlight = useCallback((ids: Set<string> | null) => {
    setChatHighlight(ids);
  }, []);

  const handleSelectNode = useCallback((id: string) => {
    selectNodeRef.current?.(id);
  }, []);

  const handleClearHighlight = useCallback(() => {
    setChatHighlight(null);
  }, []);

  const handleLogoClick = useCallback(() => {
    setView("people");
    setSearch("");
    setMatchCount(null);
    setChatHighlight(null);
    selectNodeRef.current = null;
  }, []);

  const handleViewChange = useCallback((v: ViewMode) => {
    setView(v);
    setSearch("");
    setMatchCount(null);
  }, []);

  return (
    <ThemeProvider>
      <div className="w-screen h-screen flex overflow-hidden">
        {/* Left pane: header + graph stacked vertically */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Opaque header — graph never renders behind this */}
          <AppHeader
            view={view}
            onViewChange={handleViewChange}
            onLogoClick={handleLogoClick}
            search={search}
            onSearchChange={setSearch}
            matchCount={matchCount}
          />

          {/* Graph area — fills all remaining vertical space */}
          <div className="flex-1 relative min-h-0">
            {view === "people" && (
              <OrgGraph
                search={search}
                setSearch={setSearch}
                onMatchCountChange={setMatchCount}
                chatHighlight={chatHighlight}
                onRegisterSelect={(fn) => {
                  selectNodeRef.current = fn;
                }}
                onClearHighlight={handleClearHighlight}
              />
            )}
            {view === "projects" && (
              <ProjectGraph
                chatHighlight={chatHighlight}
                onClearHighlight={handleClearHighlight}
              />
            )}
          </div>
        </div>

        {/* Right pane: chat */}
        <ChatPanel
          onHighlight={handleHighlight}
          onSelectNode={handleSelectNode}
        />
      </div>
    </ThemeProvider>
  );
}
