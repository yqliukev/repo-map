"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  GraphData,
  RankedConnection,
  DEFAULT_MIN_WEIGHT,
  linkId,
} from "./graph/types";
import { useGraphSimulation } from "./graph/useGraphSimulation";
import { useGraphEffects } from "./graph/useGraphEffects";
import Legend from "./graph/Legend";
import SettingsPanel from "./graph/SettingsPanel";
import InfoPanel from "./graph/InfoPanel";
import { useTheme } from "./ThemeContext";

interface OrgGraphProps {
  chatHighlight?: Set<string> | null;
  onRegisterSelect?: (fn: (id: string) => void) => void;
  onClearHighlight?: () => void;
  search: string;
  setSearch: (v: string) => void;
  onMatchCountChange?: (n: number | null) => void;
}

export default function OrgGraph({
  chatHighlight,
  onRegisterSelect,
  onClearHighlight,
  search,
  setSearch,
  onMatchCountChange,
}: OrgGraphProps) {
  const { theme } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);

  const [data, setData] = useState<GraphData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [minWeight, setMinWeight] = useState(DEFAULT_MIN_WEIGHT);
  const hadSelection = useRef(false);

  useEffect(() => {
    if (selected !== null) {
      hadSelection.current = true;
    } else if (hadSelection.current) {
      hadSelection.current = false;
      onClearHighlight?.();
    }
  }, [selected, onClearHighlight]);
  const [showEdges, setShowEdges] = useState(true);
  const [clustering, setClustering] = useState(true);

  useEffect(() => {
    fetch("/graph.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  useEffect(() => {
    onRegisterSelect?.((id: string) => setSelected(id));
  }, [onRegisterSelect]);

  const { gRef, simRef } = useGraphSimulation({
    data,
    svgRef,
    setSelected,
    setHovered,
    clustering,
    theme,
    onBackgroundClick: onClearHighlight,
  });

  const nodeMap = useMemo(() => {
    if (!data) return new Map();
    return new Map(data.nodes.map((n) => [n.id, n]));
  }, [data]);

  const searchMatch = useMemo(() => {
    if (!search.trim() || !data) return null;
    const q = search.toLowerCase();
    const matches = data.nodes
      .filter(
        (n) =>
          n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q),
      )
      .map((n) => n.id);
    return new Set(matches);
  }, [search, data]);

  useEffect(() => {
    onMatchCountChange?.(searchMatch ? searchMatch.size : null);
  }, [searchMatch, onMatchCountChange]);

  const rankedConnections = useMemo<RankedConnection[]>(() => {
    if (!data || !selected) return [];
    return data.links
      .filter((l) => {
        const { s, t } = linkId(l);
        return (s === selected || t === selected) && l.weight >= minWeight;
      })
      .map((l) => {
        const { s, t } = linkId(l);
        const otherId = s === selected ? t : s;
        const other = nodeMap.get(otherId);
        return {
          id: otherId,
          name: other?.name || otherId,
          team: other?.team || "",
          weight: l.weight,
        };
      })
      .sort((a, b) => b.weight - a.weight);
  }, [data, selected, nodeMap, minWeight]);

  useGraphEffects({
    gRef,
    simRef,
    data,
    minWeight,
    selected,
    searchMatch,
    chatHighlight: chatHighlight ?? null,
    showEdges,
    theme,
  });

  const selectedNode = data?.nodes.find((n) => n.id === selected);

  return (
    <div
      className={`relative w-full h-full ${theme === "dark" ? "bg-zinc-900" : "bg-slate-50"}`}
    >
      <svg ref={svgRef} className="w-full h-full" />

      {/* Legend — bottom-left */}
      <div className="absolute bottom-4 left-4 z-10">
        <Legend />
      </div>

      {/* Settings — bottom-right */}
      <div className="absolute bottom-4 right-4 z-10">
        <SettingsPanel
          minWeight={minWeight}
          setMinWeight={setMinWeight}
          showEdges={showEdges}
          setShowEdges={setShowEdges}
          clustering={clustering}
          setClustering={setClustering}
        />
      </div>

      {selectedNode && (
        <InfoPanel
          node={selectedNode}
          connections={rankedConnections}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
