"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import {
  ProjectInfo,
  SharedPerson,
  ConnectedProject,
  STATUS_COLORS,
} from "./graph/types";
import ProjectInfoPanel from "./graph/ProjectInfoPanel";
import { useTheme } from "./ThemeContext";

// ── Local simulation types ────────────────────────────────────────────────────
// ProjectInfo holds the plain data shape; ProjectNode adds d3 simulation fields.

interface ProjectNode extends d3.SimulationNodeDatum, ProjectInfo {}

interface ProjectLink extends d3.SimulationLinkDatum<ProjectNode> {
  source: string | ProjectNode;
  target: string | ProjectNode;
  weight: number;
  shared_count: number;
  shared_people: SharedPerson[];
}

interface ProjectGraphData {
  nodes: ProjectNode[];
  links: ProjectLink[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_MIN_SHARED = 1;

// ── Helpers ───────────────────────────────────────────────────────────────────

function seedPosition(id: string, max: number, offset: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return offset + (Math.abs(h) % max);
}

function nodeId(d: string | ProjectNode): string {
  return typeof d === "string" ? d : d.id;
}

function linkId(l: ProjectLink): { s: string; t: string } {
  return { s: nodeId(l.source), t: nodeId(l.target) };
}

interface ProjectGraphProps {
  chatHighlight?: Set<string> | null;
  onClearHighlight?: () => void;
}

export default function ProjectGraph({
  chatHighlight,
  onClearHighlight,
}: ProjectGraphProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<ProjectGraphData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [minShared, setMinShared] = useState(DEFAULT_MIN_SHARED);
  const hadSelection = useRef(false);
  const nodesRef = useRef<ProjectNode[]>([]);

  useEffect(() => {
    if (selected !== null) {
      hadSelection.current = true;
    } else if (hadSelection.current) {
      hadSelection.current = false;
      onClearHighlight?.();
    }
  }, [selected, onClearHighlight]);
  const [showEdges, setShowEdges] = useState(true);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/project_graph.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  // ── D3 simulation ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const pad = 80;

    const filteredLinks = data.links.filter((l) => l.shared_count >= minShared);
    const maxMembers = Math.max(...data.nodes.map((n) => n.member_count), 1);

    // Preserve positions across rebuilds (e.g. theme toggle)
    const prevPositions = new Map(
      nodesRef.current.map((n) => [n.id, { x: n.x, y: n.y }]),
    );
    const nodes: ProjectNode[] = data.nodes.map((d) => {
      const prev = prevPositions.get(d.id);
      return {
        ...d,
        x: prev?.x ?? seedPosition(d.id, width * 0.6, width * 0.2),
        y: prev?.y ?? seedPosition(d.id + "_y", height * 0.6, height * 0.2),
      };
    });
    nodesRef.current = nodes;
    const links: ProjectLink[] = filteredLinks.map((d) => ({ ...d }));

    const nodeRadius = (d: ProjectNode) =>
      14 + (d.member_count / maxMembers) * 26;

    const simulation = d3
      .forceSimulation<ProjectNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<ProjectNode, ProjectLink>(links)
          .id((d) => d.id)
          .distance((d) => 160 * (1 - d.weight) + 80)
          .strength((d) => 0.2 + d.weight * 0.5),
      )
      .force("charge", d3.forceManyBody().strength(-600).distanceMax(400))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.1))
      .force(
        "collision",
        d3.forceCollide().radius((d) => nodeRadius(d as ProjectNode) + 30),
      )
      .force("bounds", () => {
        for (const d of nodes) {
          if (d.x! < pad) d.vx! += (pad - d.x!) * 0.1;
          if (d.x! > width - pad) d.vx! -= (d.x! - (width - pad)) * 0.1;
          if (d.y! < pad) d.vy! += (pad - d.y!) * 0.1;
          if (d.y! > height - pad) d.vy! -= (d.y! - (height - pad)) * 0.1;
        }
      });

    // ── SVG scaffold ──────────────────────────────────────────────────────────
    const g = svg.append("g");

    // Transparent backdrop to deselect on empty-canvas click
    g.append("rect")
      .attr("width", width * 3)
      .attr("height", height * 3)
      .attr("x", -width)
      .attr("y", -height)
      .attr("fill", "transparent")
      .on("click", () => {
        setSelected(null);
        onClearHighlight?.();
      });

    const margin = 150;
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 3])
        .translateExtent([
          [-margin, -margin],
          [width + margin, height + margin],
        ])
        .on("zoom", (event) => g.attr("transform", event.transform)),
    );

    // ── Edges ─────────────────────────────────────────────────────────────────
    const link = g
      .append("g")
      .selectAll<SVGLineElement, ProjectLink>("line")
      .data(links)
      .join("line")
      .attr("stroke", isDark ? "#52525b" : "#cbd5e1")
      .attr("stroke-opacity", showEdges ? 0.5 : 0)
      .attr("stroke-width", (d) => Math.max(1.5, d.weight * 8));

    // Shared-count pill labels on edges
    const linkLabelGroup = g
      .append("g")
      .attr("class", "link-labels")
      .style("opacity", showEdges ? 1 : 0)
      .selectAll<SVGGElement, ProjectLink>("g")
      .data(links.filter((l) => l.shared_count > 0))
      .join("g")
      .attr("pointer-events", "none");

    linkLabelGroup
      .append("rect")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("width", 20)
      .attr("height", 16)
      .attr("x", -10)
      .attr("y", -10)
      .attr("fill", isDark ? "rgba(24,24,27,0.92)" : "rgba(255,255,255,0.95)")
      .attr("stroke", isDark ? "rgba(63,63,70,0.5)" : "rgba(203,213,225,0.8)")
      .attr("stroke-width", 1);

    linkLabelGroup
      .append("text")
      .text((d) => d.shared_count.toString())
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .attr("fill", isDark ? "#a1a1aa" : "#475569")
      .attr("font-size", "10px")
      .attr("font-weight", "600");

    // ── Nodes ─────────────────────────────────────────────────────────────────
    const node = g
      .append("g")
      .selectAll<SVGGElement, ProjectNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, ProjectNode>()
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
          }),
      );

    node
      .append("circle")
      .attr("r", (d) => nodeRadius(d))
      .attr("fill", (d) => STATUS_COLORS[d.status] || "#64748b")
      .attr("fill-opacity", 0.12)
      .attr("stroke", (d) => STATUS_COLORS[d.status] || "#64748b")
      .attr("stroke-width", 2.5);

    // Project name — word-wrapped: ≤20 chars per line, minimum 2 words per line
    const LINE_H = 14;
    node.each(function (d) {
      const words = d.display_name.split(/\s+/);
      const lines: string[] = [];
      let current: string[] = [];
      for (const word of words) {
        const candidate = [...current, word].join(" ");
        if (
          current.length === 0 ||
          candidate.length <= 20 ||
          current.length < 2
        ) {
          current.push(word);
        } else {
          lines.push(current.join(" "));
          current = [word];
        }
      }
      if (current.length > 0) lines.push(current.join(" "));
      // Centre the multi-line block vertically on the node
      const halfH = ((lines.length - 1) * LINE_H) / 2;
      const textEl = d3
        .select(this)
        .append("text")
        .attr("text-anchor", "middle")
        .attr("fill", isDark ? "#e5e7eb" : "#0f172a")
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("pointer-events", "none");
      lines.forEach((line, i) => {
        textEl
          .append("tspan")
          .attr("x", 0)
          .attr("dy", i === 0 ? 4 - halfH : LINE_H)
          .text(line);
      });
    });

    // Member count sub-label
    node
      .append("text")
      .text(
        (d) =>
          `${d.member_count} ${d.member_count === 1 ? "person" : "people"}`,
      )
      .attr("text-anchor", "middle")
      .attr("dy", (d) => nodeRadius(d) + 15)
      .attr("fill", isDark ? "#71717a" : "#64748b")
      .attr("font-size", "9px")
      .attr("pointer-events", "none");

    node.on("click", (_event, d) => {
      setSelected((prev) => (prev === d.id ? null : d.id));
    });

    // ── Tick ──────────────────────────────────────────────────────────────────
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as ProjectNode).x!)
        .attr("y1", (d) => (d.source as ProjectNode).y!)
        .attr("x2", (d) => (d.target as ProjectNode).x!)
        .attr("y2", (d) => (d.target as ProjectNode).y!);

      linkLabelGroup.attr("transform", (d) => {
        const s = d.source as ProjectNode;
        const t = d.target as ProjectNode;
        return `translate(${(s.x! + t.x!) / 2},${(s.y! + t.y!) / 2})`;
      });

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data, minShared, isDark]);

  // Selection + chat highlighting
  useEffect(() => {
    if (!svgRef.current || !data) return;
    const svg = d3.select(svgRef.current);

    const hasHighlight = selected || (chatHighlight && chatHighlight.size > 0);

    if (!hasHighlight) {
      svg.selectAll("line").attr("stroke-opacity", showEdges ? 0.5 : 0);
      svg.select(".link-labels").style("opacity", showEdges ? 1 : 0);
      svg
        .selectAll<SVGGElement, ProjectNode>("g > circle")
        .attr("opacity", 1)
        .attr("stroke-width", 2);
      svg.selectAll<SVGGElement, ProjectNode>("g > text").attr("opacity", 1);
      return;
    }

    const connected = new Set<string>();
    if (selected) {
      connected.add(selected);
      data.links.forEach((l) => {
        const { s, t } = linkId(l);
        if (l.shared_count >= minShared) {
          if (s === selected) connected.add(t);
          if (t === selected) connected.add(s);
        }
      });
    }

    if (chatHighlight) {
      chatHighlight.forEach((id) => connected.add(id));
    }

    svg
      .selectAll<SVGLineElement, ProjectLink>("line")
      .attr("stroke-opacity", (d) => {
        if (!showEdges) return 0;
        const { s, t } = linkId(d);
        if (selected && (s === selected || t === selected)) return 0.8;
        if (chatHighlight && chatHighlight.has(s) && chatHighlight.has(t))
          return 0.7;
        return 0.05;
      });

    svg.select(".link-labels").style("opacity", showEdges ? 1 : 0);

    svg
      .selectAll<SVGGElement, ProjectNode>("g")
      .selectAll<SVGCircleElement, ProjectNode>("circle")
      .attr("opacity", function () {
        const d = d3
          .select(this.parentNode as SVGGElement)
          .datum() as ProjectNode;
        if (!d) return 1;
        if (chatHighlight && chatHighlight.has(d.id)) return 1;
        return connected.has(d.id) ? 1 : 0.15;
      })
      .attr("stroke-width", function () {
        const d = d3
          .select(this.parentNode as SVGGElement)
          .datum() as ProjectNode;
        if (d && chatHighlight && chatHighlight.has(d.id)) return 4;
        return 2;
      });

    svg
      .selectAll<SVGGElement, ProjectNode>("g")
      .selectAll<SVGTextElement, ProjectNode>("text")
      .attr("opacity", function () {
        const d = d3
          .select(this.parentNode as SVGGElement)
          .datum() as ProjectNode;
        if (!d) return 1;
        return connected.has(d.id) ? 1 : 0.1;
      });
  }, [selected, chatHighlight, data, minShared, showEdges]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const selectedProject = data?.nodes.find((n) => n.id === selected) ?? null;

  const connectedProjects = useMemo<ConnectedProject[]>(() => {
    if (!data || !selected) return [];
    return data.links
      .filter((l) => {
        const { s, t } = linkId(l);
        return (
          (s === selected || t === selected) && l.shared_count >= minShared
        );
      })
      .map((l) => {
        const { s, t } = linkId(l);
        const otherId = s === selected ? t : s;
        const other = data.nodes.find((n) => n.id === otherId);
        return {
          id: otherId,
          // display_name is the clean label; fall back gracefully for old data
          name: other?.display_name ?? other?.name ?? otherId,
          weight: l.weight,
          shared_count: l.shared_count,
          shared_people: l.shared_people,
        };
      })
      .sort((a, b) => b.shared_count - a.shared_count);
  }, [data, selected, minShared]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`relative w-full h-full ${isDark ? "bg-zinc-900" : "bg-slate-50"}`}>
      <svg
        ref={svgRef}
        className="w-full h-full"
      />

      {/* Status legend — bottom-left */}
      <div className="absolute bottom-4 left-4 z-10">
        <div
          className={`rounded-lg px-4 py-3 text-sm space-y-1.5 ${
            isDark
              ? "bg-zinc-800/80 text-zinc-300"
              : "bg-white/90 border border-slate-200 shadow-sm text-slate-700"
          }`}
        >
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full border-2"
                style={{ borderColor: color, backgroundColor: color + "20" }}
              />
              <span className="capitalize">{status}</span>
            </div>
          ))}
          <div
            className={`text-[10px] pt-1 ${isDark ? "text-zinc-500" : "text-slate-400"}`}
          >
            Node size = team size
          </div>
          <div
            className={`text-[10px] ${isDark ? "text-zinc-500" : "text-slate-400"}`}
          >
            Edge label = shared people
          </div>
        </div>
      </div>

      {/* Settings — bottom-right */}
      <div className="absolute bottom-4 right-4 z-10">
        <div
          className={`rounded-xl px-4 py-3 text-sm w-64 ${
            isDark
              ? "bg-zinc-800/90 text-zinc-300"
              : "bg-white border border-slate-200 shadow-md text-slate-700"
          }`}
        >
        <div className="flex items-center justify-between mb-2">
          <label
            className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-slate-500"}`}
          >
            Min shared people
          </label>
          <span
            className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded ${
              isDark
                ? "text-zinc-400 bg-zinc-700/60"
                : "text-slate-400 bg-slate-100"
            }`}
          >
            {minShared}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={minShared}
          onChange={(e) => setMinShared(parseInt(e.target.value))}
          className={`w-full h-1.5 cursor-pointer rounded-full ${
            isDark ? "accent-zinc-400" : "accent-blue-600"
          }`}
        />
        <div
          className={`flex justify-between text-[10px] mt-1 ${
            isDark ? "text-zinc-600" : "text-slate-300"
          }`}
        >
          <span>All connections</span>
          <span>Strong only</span>
        </div>
        <div
          className={`flex items-center justify-between mt-4 pt-3 border-t ${
            isDark ? "border-zinc-700/50" : "border-slate-100"
          }`}
        >
          <label
            className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-slate-500"}`}
          >
            Show edges
          </label>
          <button
            onClick={() => setShowEdges((v) => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${
              showEdges
                ? "bg-blue-600"
                : isDark
                  ? "bg-zinc-600"
                  : "bg-slate-200"
            }`}
            role="switch"
            aria-checked={showEdges}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                showEdges ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Appearance */}
        <div
          className={`flex items-center justify-between mt-4 pt-3 border-t ${
            isDark ? "border-zinc-700/50" : "border-slate-100"
          }`}
        >
          <label
            className={`text-xs font-medium flex items-center gap-1.5 ${
              isDark ? "text-zinc-400" : "text-slate-500"
            }`}
          >
            {isDark ? (
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="4" />
                <line x1="12" y1="20" x2="12" y2="22" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="2" y1="12" x2="4" y2="12" />
                <line x1="20" y1="12" x2="22" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
            Dark mode
          </label>
          <button
            onClick={toggleTheme}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${
              isDark ? "bg-blue-600" : "bg-slate-200"
            }`}
            role="switch"
            aria-checked={isDark}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                isDark ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
      </div>

      {/* Info panel */}
      {selectedProject && (
        <ProjectInfoPanel
          project={selectedProject}
          connectedProjects={connectedProjects}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
