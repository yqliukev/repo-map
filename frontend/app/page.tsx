"use client";

import { useMemo, useState } from "react";
import AppHeader from "./components/AppHeader";
import ContributorGraph from "./components/ContributorGraph";
import GraphTabs, { type GraphTab } from "./components/GraphTabs";
import ProjectGraph from "./components/ProjectGraph";
import { RepoProvider, useRepo } from "./components/RepoContext";
import TechnologySidebar from "./components/TechnologySidebar";
import { ThemeProvider, useTheme } from "./components/ThemeContext";
import { resolveNodeTechnologies } from "@/lib/skills";

type SelectedNode =
  | { tab: "contributors"; id: string }
  | { tab: "projects"; id: string }
  | null;

function MainArea() {
  const { theme } = useTheme();
  const { selectedSlug, bundle, status, error, selectRepo } = useRepo();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState<GraphTab>("contributors");
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);

  const handleTabChange = (tab: GraphTab) => {
    setActiveTab(tab);
    setSelectedNode(null);
  };

  const sidebarData = useMemo(() => {
    if (!bundle || !selectedNode) return null;

    if (selectedNode.tab === "contributors" && bundle.graph) {
      const node = bundle.graph.nodes.find((n) => n.id === selectedNode.id);
      if (!node) return null;
      return {
        title: node.name || node.id,
        groups: resolveNodeTechnologies(bundle.skills, node.skills),
      };
    }

    if (selectedNode.tab === "projects" && bundle.projectGraph) {
      const node = bundle.projectGraph.nodes.find((n) => n.id === selectedNode.id);
      if (!node) return null;
      return {
        title: node.name || node.id,
        groups: resolveNodeTechnologies(bundle.skills, node.skills),
      };
    }

    return null;
  }, [bundle, selectedNode]);

  const baseText = isDark ? "text-zinc-400" : "text-slate-500";
  const headingText = isDark ? "text-zinc-200" : "text-slate-800";

  if (!selectedSlug) {
    return (
      <main
        className={`flex-1 min-h-0 flex items-center justify-center ${
          isDark ? "bg-zinc-950" : "bg-slate-50"
        }`}
      >
        <p className={baseText}>Select a repository</p>
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main
        className={`flex-1 min-h-0 flex items-center justify-center ${
          isDark ? "bg-zinc-950" : "bg-slate-50"
        }`}
      >
        <span
          className={`inline-block w-8 h-8 border-2 rounded-full animate-spin ${
            isDark ? "border-zinc-700 border-t-zinc-300" : "border-slate-200 border-t-slate-600"
          }`}
          aria-label="Loading"
        />
      </main>
    );
  }

  if (status === "error") {
    return (
      <main
        className={`flex-1 min-h-0 flex flex-col items-center justify-center gap-3 ${
          isDark ? "bg-zinc-950" : "bg-slate-50"
        }`}
      >
        <p className="text-red-500 text-sm">{error ?? "Failed to load repository"}</p>
        <button
          onClick={() => selectRepo(selectedSlug)}
          className={`text-sm px-3 py-1.5 rounded-lg cursor-pointer ${
            isDark
              ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
              : "bg-slate-200 text-slate-800 hover:bg-slate-300"
          }`}
        >
          Retry
        </button>
      </main>
    );
  }

  if (!bundle) {
    return (
      <main
        className={`flex-1 min-h-0 flex items-center justify-center ${
          isDark ? "bg-zinc-950" : "bg-slate-50"
        }`}
      >
        <p className={baseText}>No data loaded</p>
      </main>
    );
  }

  if (!bundle.readiness.graphs || !bundle.graph || !bundle.projectGraph) {
    return (
      <main
        className={`flex-1 min-h-0 flex items-center justify-center p-8 ${
          isDark ? "bg-zinc-950" : "bg-slate-50"
        }`}
      >
        <div
          className={`max-w-md w-full rounded-xl border p-6 space-y-3 ${
            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}
        >
          <h2 className={`text-lg font-medium ${headingText}`}>{bundle.repo}</h2>
          <p className={`text-sm ${baseText}`}>
            Scraped {new Date(bundle.meta.scraped_at).toLocaleDateString()} ·{" "}
            {bundle.meta.pr_count} PRs
          </p>
          <div className={`text-sm space-y-1 ${baseText}`}>
            <p>Enriched: {bundle.readiness.enriched ? "Yes" : "No"}</p>
            <p>Computed: {bundle.readiness.computed ? "Yes" : "No"}</p>
            <p>Graphs: {bundle.readiness.graphs ? "Yes" : "No"}</p>
          </div>
          <p className={`text-sm ${baseText}`}>
            Run{" "}
            <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded">
              cd compute && npm run build -- --repo {bundle.repo}
            </code>{" "}
            to generate graphs.
          </p>
        </div>
      </main>
    );
  }

  const selectedId = selectedNode?.tab === activeTab ? selectedNode.id : null;

  return (
    <main
      className={`flex-1 min-h-0 flex flex-col ${
        isDark ? "bg-zinc-950" : "bg-slate-50"
      }`}
    >
      <GraphTabs activeTab={activeTab} onTabChange={handleTabChange}>
        <div className="flex flex-1 min-h-0 w-full">
          <div className="flex-1 min-w-0 min-h-0">
            {activeTab === "contributors" ? (
              <ContributorGraph
                graph={bundle.graph}
                theme={theme}
                selectedId={selectedId}
                onNodeClick={(id) =>
                  setSelectedNode({ tab: "contributors", id })
                }
                onBackgroundClick={() => setSelectedNode(null)}
              />
            ) : (
              <ProjectGraph
                graph={bundle.projectGraph}
                theme={theme}
                selectedId={selectedId}
                onNodeClick={(id) => setSelectedNode({ tab: "projects", id })}
                onBackgroundClick={() => setSelectedNode(null)}
              />
            )}
          </div>
          {sidebarData && (
            <TechnologySidebar
              title={sidebarData.title}
              groups={sidebarData.groups}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </div>
      </GraphTabs>
    </main>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <RepoProvider>
        <div className="w-screen h-screen flex flex-col overflow-hidden">
          <AppHeader />
          <MainArea />
        </div>
      </RepoProvider>
    </ThemeProvider>
  );
}
