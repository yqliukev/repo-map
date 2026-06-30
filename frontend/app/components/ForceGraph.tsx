"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { Theme } from "./ThemeContext";

export interface ForceGraphNode {
  id: string;
  label: string;
  radius?: number;
}

export interface ForceGraphLink {
  source: string;
  target: string;
  weight: number;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  radius: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  weight: number;
}

interface ForceGraphProps {
  nodes: ForceGraphNode[];
  links: ForceGraphLink[];
  theme: Theme;
  selectedId: string | null;
  onNodeClick: (id: string) => void;
  onBackgroundClick: () => void;
}

export default function ForceGraph({
  nodes,
  links,
  theme,
  selectedId,
  onNodeClick,
  onBackgroundClick,
}: ForceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const callbacksRef = useRef({ onNodeClick, onBackgroundClick });
  callbacksRef.current = { onNodeClick, onBackgroundClick };

  const isDark = theme === "dark";

  useEffect(() => {
    const container = containerRef.current;
    const svgEl = svgRef.current;
    if (!container || !svgEl || nodes.length === 0) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const g = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom).on("click", () => {
      callbacksRef.current.onBackgroundClick();
    });

    const simNodes: SimNode[] = nodes.map((n) => ({
      id: n.id,
      label: n.label,
      radius: n.radius ?? 10,
    }));

    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = links
      .filter((l) => nodeById.has(l.source) && nodeById.has(l.target))
      .map((l) => ({
        source: l.source,
        target: l.target,
        weight: l.weight,
      }));

    const linkColor = isDark ? "#52525b" : "#cbd5e1";
    const linkHighlight = isDark ? "#a1a1aa" : "#64748b";
    const nodeFill = isDark ? "#3f3f46" : "#e2e8f0";
    const nodeStroke = isDark ? "#71717a" : "#94a3b8";
    const nodeSelectedStroke = isDark ? "#f4f4f5" : "#0f172a";
    const labelColor = isDark ? "#d4d4d8" : "#334155";

    const link = g
      .append("g")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", linkColor)
      .attr("stroke-width", (d) => Math.max(0.5, Math.min(3, d.weight * 0.5)));

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(80)
          .strength(0.3)
      )
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3.forceCollide<SimNode>().radius((d) => d.radius + 8)
      );

    const dragBehavior = d3
      .drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    const node = g
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .style("cursor", "pointer")
      .call(dragBehavior);

    node.on("click", (event, d) => {
      event.stopPropagation();
      callbacksRef.current.onNodeClick(d.id);
    });

    node
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", nodeFill)
      .attr("stroke", nodeStroke)
      .attr("stroke-width", 1.5);

    node
      .append("text")
      .text((d) => d.label)
      .attr("x", (d) => d.radius + 4)
      .attr("y", 4)
      .attr("font-size", 11)
      .attr("fill", labelColor)
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);

      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    function updateSelection() {
      node.select("circle").attr("stroke", (d) =>
        d.id === selectedId ? nodeSelectedStroke : nodeStroke
      ).attr("stroke-width", (d) => (d.id === selectedId ? 3 : 1.5));

      const adjacent = new Set<string>();
      if (selectedId) {
        adjacent.add(selectedId);
        for (const l of simLinks) {
          const s = l.source as SimNode;
          const t = l.target as SimNode;
          if (s.id === selectedId) adjacent.add(t.id);
          if (t.id === selectedId) adjacent.add(s.id);
        }
      }

      node.style("opacity", (d) =>
        !selectedId || adjacent.has(d.id) ? 1 : 0.25
      );
      link
        .attr("stroke-opacity", (d) => {
          if (!selectedId) return 0.6;
          const s = d.source as SimNode;
          const t = d.target as SimNode;
          return s.id === selectedId || t.id === selectedId ? 0.9 : 0.1;
        })
        .attr("stroke", (d) => {
          if (!selectedId) return linkColor;
          const s = d.source as SimNode;
          const t = d.target as SimNode;
          return s.id === selectedId || t.id === selectedId
            ? linkHighlight
            : linkColor;
        });
    }

    updateSelection();

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      svg.attr("width", w).attr("height", h);
      simulation.force("center", d3.forceCenter(w / 2, h / 2));
      simulation.alpha(0.3).restart();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      simulation.stop();
    };
  }, [nodes, links, isDark, selectedId]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-0">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
