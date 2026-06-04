import { useEffect } from "react";
import * as d3 from "d3";
import {
  Node,
  Link,
  GraphData,
  TRANSITION_MS,
  TEAM_COLORS,
  linkId,
} from "./types";

interface UseGraphEffectsOptions {
  gRef: React.RefObject<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>;
  simRef: React.RefObject<d3.Simulation<Node, Link> | null>;
  data: GraphData | null;
  minWeight: number;
  selected: string | null;
  searchMatch: Set<string> | null;
  chatHighlight: Set<string> | null;
  showEdges: boolean;
  theme: "light" | "dark";
}

export function useGraphEffects({
  gRef,
  simRef,
  data,
  minWeight,
  selected,
  searchMatch,
  chatHighlight,
  showEdges,
  theme,
}: UseGraphEffectsOptions) {
  // ── Min-weight threshold transitions ────────────────────────────────────
  useEffect(() => {
    if (!gRef.current || !data || !simRef.current) return;

    const isDark = theme === "dark";
    const g = gRef.current;
    const simulation = simRef.current;

    const linkForce = simulation.force("link") as d3.ForceLink<Node, Link>;
    if (linkForce) {
      linkForce.strength((d) =>
        d.weight >= minWeight ? 0.3 + d.weight * 0.7 : 0,
      );
    }
    simulation.alpha(0.15).restart();

    g.select(".links")
      .selectAll<SVGLineElement, Link>("line")
      .transition()
      .duration(TRANSITION_MS)
      .attr("stroke-opacity", (d) =>
        d.weight >= minWeight && showEdges ? 0.4 : 0,
      );

    const degree = new Map<string, number>();
    data.links.forEach((l) => {
      if (l.weight >= minWeight) {
        const { s, t } = linkId(l);
        degree.set(s, (degree.get(s) || 0) + 1);
        degree.set(t, (degree.get(t) || 0) + 1);
      }
    });
    const maxDegree = Math.max(...(degree.size ? degree.values() : [1]), 1);

    g.select(".nodes")
      .selectAll<SVGGElement, Node>("g")
      .select("circle")
      .transition()
      .duration(TRANSITION_MS)
      .attr("r", (d: Node) => {
        const deg = degree.get(d.id) || 1;
        return 6 + (deg / maxDegree) * 14;
      });

    // Resize initials font to match new circle radius
    g.select(".nodes")
      .selectAll<SVGGElement, Node>("g")
      .select("text.node-initials")
      .transition()
      .duration(TRANSITION_MS)
      .attr("font-size", (d: Node) => {
        const deg = degree.get(d.id) || 1;
        const r = 6 + (deg / maxDegree) * 14;
        return `${Math.max(7, Math.floor(r * 0.62))}px`;
      });

    // Reposition floating name label
    g.select(".nodes")
      .selectAll<SVGGElement, Node>("g")
      .select("text.node-label")
      .transition()
      .duration(TRANSITION_MS)
      .attr("dy", (d: Node) => {
        const deg = degree.get(d.id) || 1;
        return -(8 + (deg / maxDegree) * 14);
      });

    // Unused variable suppression
    void isDark;
  }, [minWeight, data, theme, gRef, simRef, showEdges]);

  // ── Selection + search highlighting ─────────────────────────────────────
  useEffect(() => {
    if (!gRef.current || !data) return;

    const isDark = theme === "dark";
    const g = gRef.current;

    // Dark mode defaults
    const defaultStroke = isDark
      ? (d: Node) => TEAM_COLORS[d.team] || "#6b7280" // kept as solid team fill stroke
      : (d: Node) => TEAM_COLORS[d.team] || "#94a3b8";
    const defaultStrokeWidth = isDark ? 1.5 : 2.5;
    const resetLinkStroke = isDark ? "#999" : "#cbd5e1";

    const activeHighlight =
      selected ||
      (searchMatch && searchMatch.size > 0) ||
      (chatHighlight && chatHighlight.size > 0);

    // ── Reset: no highlight active ─────────────────────────────────────────
    if (!activeHighlight) {
      g.select(".links")
        .selectAll<SVGLineElement, Link>("line")
        .transition()
        .duration(200)
        .attr("stroke", resetLinkStroke)
        .attr("stroke-opacity", (d) =>
          d.weight >= minWeight && showEdges ? 0.4 : 0,
        );

      g.select(".nodes")
        .selectAll<SVGGElement, Node>("g")
        .select("circle")
        .transition()
        .duration(200)
        .attr("opacity", 1)
        .attr("stroke", defaultStroke)
        .attr("stroke-width", defaultStrokeWidth);

      g.select(".nodes")
        .selectAll<SVGGElement, Node>("g")
        .select("text.node-initials")
        .transition()
        .duration(200)
        .attr("opacity", 1);

      g.select(".nodes")
        .selectAll<SVGGElement, Node>("g")
        .select("image.node-avatar")
        .transition()
        .duration(200)
        .attr("opacity", 1);

      g.select(".nodes")
        .selectAll<SVGGElement, Node>("g")
        .select("text.node-label")
        .transition()
        .duration(200)
        .attr("opacity", 1);

      return;
    }

    // ── Build highlighted ID set ───────────────────────────────────────────
    const highlightedIds = new Set<string>();

    if (selected) {
      highlightedIds.add(selected);
      data.links.forEach((l) => {
        const { s, t } = linkId(l);
        if (l.weight >= minWeight) {
          if (s === selected) highlightedIds.add(t);
          if (t === selected) highlightedIds.add(s);
        }
      });
    }

    if (searchMatch) searchMatch.forEach((id) => highlightedIds.add(id));
    if (chatHighlight) chatHighlight.forEach((id) => highlightedIds.add(id));

    // ── Links ──────────────────────────────────────────────────────────────
    g.select(".links")
      .selectAll<SVGLineElement, Link>("line")
      .transition()
      .duration(200)
      .attr("stroke-opacity", (d) => {
        if (!showEdges || d.weight < minWeight) return 0;
        const { s, t } = linkId(d);
        if (selected && (s === selected || t === selected)) return 0.8;
        if (searchMatch && searchMatch.has(s) && searchMatch.has(t)) return 0.6;
        if (chatHighlight && chatHighlight.has(s) && chatHighlight.has(t))
          return 0.7;
        return 0.05;
      });

    // ── Circles ────────────────────────────────────────────────────────────
    g.select(".nodes")
      .selectAll<SVGGElement, Node>("g")
      .select("circle")
      .transition()
      .duration(200)
      .attr("opacity", (d: Node) => (highlightedIds.has(d.id) ? 1 : 0.12))
      .attr("stroke", (d: Node) => {
        if (chatHighlight && chatHighlight.has(d.id)) return "#818cf8";
        if (searchMatch && searchMatch.has(d.id))
          return isDark ? "#facc15" : "#f59e0b";
        return isDark
          ? TEAM_COLORS[d.team] || "#6b7280"
          : TEAM_COLORS[d.team] || "#94a3b8";
      })
      .attr("stroke-width", (d: Node) => {
        if (chatHighlight && chatHighlight.has(d.id)) return isDark ? 3 : 4;
        if (searchMatch && searchMatch.has(d.id)) return isDark ? 3 : 4;
        return defaultStrokeWidth;
      });

    // ── Initials ──────────────────────────────────────────────────────────────
    g.select(".nodes")
      .selectAll<SVGGElement, Node>("g")
      .select("text.node-initials")
      .transition()
      .duration(200)
      .attr("opacity", (d: Node) => (highlightedIds.has(d.id) ? 1 : 0.12));

    // ── Avatar images ──────────────────────────────────────────────────────
    g.select(".nodes")
      .selectAll<SVGGElement, Node>("g")
      .select("image.node-avatar")
      .transition()
      .duration(200)
      .attr("opacity", (d: Node) => (highlightedIds.has(d.id) ? 1 : 0.12));

    // ── Name label ─────────────────────────────────────────────────────────
    g.select(".nodes")
      .selectAll<SVGGElement, Node>("g")
      .select("text.node-label")
      .transition()
      .duration(200)
      .attr("opacity", (d: Node) => (highlightedIds.has(d.id) ? 1 : 0.08));
  }, [
    selected,
    searchMatch,
    chatHighlight,
    data,
    minWeight,
    showEdges,
    theme,
    gRef,
  ]);
}
