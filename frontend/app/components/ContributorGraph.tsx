"use client";

import type { GraphData } from "@/lib/types";
import type { Theme } from "./ThemeContext";
import ForceGraph from "./ForceGraph";

interface ContributorGraphProps {
  graph: GraphData;
  theme: Theme;
  selectedId: string | null;
  onNodeClick: (id: string) => void;
  onBackgroundClick: () => void;
}

export default function ContributorGraph({
  graph,
  theme,
  selectedId,
  onNodeClick,
  onBackgroundClick,
}: ContributorGraphProps) {
  const nodes = graph.nodes.map((n) => ({
    id: n.id,
    label: n.name || n.id,
    radius: 10 + Math.min(8, Math.log2(n.pr_count + n.review_count + 1)),
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
