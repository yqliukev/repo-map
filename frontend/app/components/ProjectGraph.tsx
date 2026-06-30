"use client";

import type { ProjectGraphData } from "@/lib/types";
import type { Theme } from "./ThemeContext";
import ForceGraph from "./ForceGraph";

interface ProjectGraphProps {
  graph: ProjectGraphData;
  theme: Theme;
  selectedId: string | null;
  onNodeClick: (id: string) => void;
  onBackgroundClick: () => void;
}

export default function ProjectGraph({
  graph,
  theme,
  selectedId,
  onNodeClick,
  onBackgroundClick,
}: ProjectGraphProps) {
  const nodes = graph.nodes.map((n) => ({
    id: n.id,
    label: n.name || n.id,
    radius: 12 + Math.min(12, Math.log2(n.contributor_count + 1) * 3),
  }));

  const links = graph.links.map((l) => ({
    source: l.source,
    target: l.target,
    weight: l.weight,
  }));

  return (
    <ForceGraph
      nodes={nodes}
      links={links}
      theme={theme}
      selectedId={selectedId}
      onNodeClick={onNodeClick}
      onBackgroundClick={onBackgroundClick}
    />
  );
}
