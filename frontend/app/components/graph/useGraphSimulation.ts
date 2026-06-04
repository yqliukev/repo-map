import { useEffect, useRef } from "react";
import * as d3 from "d3";
import {
  Node,
  Link,
  GraphData,
  DEFAULT_MIN_WEIGHT,
  TEAM_COLORS,
  TEAM_LIGHT_FILL,
  PROJECT_PALETTE,
  nodeId,
  linkId,
} from "./types";

const hullLine = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.5));

function getHullPath(groupNodes: Node[], pad: number): string {
  const pts: [number, number][] = [];
  groupNodes.forEach((n) => {
    if (n.x == null || n.y == null) return;
    for (let i = 0; i < 50; i++) {
      const a = (i / 50) * 2 * Math.PI;
      pts.push([n.x + Math.cos(a) * pad, n.y + Math.sin(a) * pad]);
    }
  });
  const hull = d3.polygonHull(pts);
  return hull ? (hullLine(hull) ?? "") : "";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

interface UseGraphSimulationOptions {
  data: GraphData | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
  setSelected: React.Dispatch<React.SetStateAction<string | null>>;
  setHovered: React.Dispatch<React.SetStateAction<string | null>>;
  clustering: boolean;
  theme: "light" | "dark";
  onBackgroundClick?: () => void;
}

function seedPosition(id: string, max: number, offset: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return offset + (Math.abs(h) % max);
}

export function useGraphSimulation({
  data,
  svgRef,
  setSelected,
  setHovered,
  clustering,
  theme,
  onBackgroundClick,
}: UseGraphSimulationOptions) {
  const simRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const gRef = useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const isDark = theme === "dark";

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const pad = 40;

    // Preserve positions across rebuilds (e.g. theme toggle)
    const prevPositions = new Map(
      nodesRef.current.map((n) => [n.id, { x: n.x, y: n.y }]),
    );

    const nodes: Node[] = data.nodes.map((d) => {
      const prev = prevPositions.get(d.id);
      return {
        ...d,
        x: prev?.x ?? seedPosition(d.id, width * 0.6, width * 0.2),
        y: prev?.y ?? seedPosition(d.id + "_y", height * 0.6, height * 0.2),
      };
    });
    nodesRef.current = nodes;
    const allLinks: Link[] = data.links.map((d) => ({ ...d }));

    // ── Leiden community clustering (conditional) ────────────────────────
    const communityGroups = new Map<number, Node[]>();
    nodes.forEach((n) => {
      if (n.community == null) return;
      if (!communityGroups.has(n.community))
        communityGroups.set(n.community, []);
      communityGroups.get(n.community)!.push(n);
    });

    const validGroups = clustering
      ? [...communityGroups.entries()].filter(([, ns]) => ns.length >= 2)
      : [];
    const communityIds = validGroups.map(([c]) => String(c));

    const communityColor = d3
      .scaleOrdinal<string>()
      .domain(communityIds)
      .range(PROJECT_PALETTE);

    const clusterRing = Math.min(width, height) * 0.38;
    const communityAnchors = new Map<number, { x: number; y: number }>();
    if (clustering) {
      validGroups.forEach(([comm], i) => {
        const angle = (i / validGroups.length) * 2 * Math.PI - Math.PI / 2;
        communityAnchors.set(comm, {
          x: width / 2 + clusterRing * Math.cos(angle),
          y: height / 2 + clusterRing * Math.sin(angle),
        });
      });
    }

    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force(
        "link",
        d3
          .forceLink<Node, Link>(allLinks)
          .id((d) => d.id)
          .distance((d) => 200 * (1 - d.weight) + 30)
          .strength((d) =>
            d.weight >= DEFAULT_MIN_WEIGHT ? 0.3 + d.weight * 0.7 : 0,
          ),
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30))
      .force("bounds", () => {
        for (const d of nodes) {
          if (d.x! < pad) d.vx! += (pad - d.x!) * 0.1;
          if (d.x! > width - pad) d.vx! -= (d.x! - (width - pad)) * 0.1;
          if (d.y! < pad) d.vy! += (pad - d.y!) * 0.1;
          if (d.y! > height - pad) d.vy! -= (d.y! - (height - pad)) * 0.1;
        }
      });

    if (clustering) {
      simulation
        .force(
          "clusterX",
          d3
            .forceX<Node>((d) => {
              return d.community != null
                ? (communityAnchors.get(d.community)?.x ?? width / 2)
                : width / 2;
            })
            .strength(0.2),
        )
        .force(
          "clusterY",
          d3
            .forceY<Node>((d) => {
              return d.community != null
                ? (communityAnchors.get(d.community)?.y ?? height / 2)
                : height / 2;
            })
            .strength(0.2),
        );

      simulation.force("clusterRepulsion", ((alpha: number) => {
        nodes.forEach((n) => {
          if (n.x == null || n.y == null) return;
          const myComm = n.community;
          communityAnchors.forEach((anchor, comm) => {
            if (comm === myComm) return;
            const dx = n.x! - anchor.x;
            const dy = n.y! - anchor.y;
            const dist = Math.hypot(dx, dy) || 1;
            const minDist = 220;
            if (dist < minDist) {
              const f = alpha * (1 - dist / minDist) * 1.8;
              n.vx! += (dx / dist) * f;
              n.vy! += (dy / dist) * f;
            }
          });
        });
      }) as unknown as d3.Force<Node, Link>);
    }

    simRef.current = simulation;

    const g = svg.append("g");
    gRef.current = g;

    // Invisible background rect to catch clicks on empty space
    g.append("rect")
      .attr("width", width * 3)
      .attr("height", height * 3)
      .attr("x", -width)
      .attr("y", -height)
      .attr("fill", "transparent")
      .on("click", () => {
        setSelected(null);
        onBackgroundClick?.();
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

    // Hull group — rendered behind links and nodes
    const hullGroup = g.append("g").attr("class", "hulls");

    const hullPaths = hullGroup
      .selectAll<SVGPathElement, [number, Node[]]>("path")
      .data(validGroups)
      .join("path")
      .attr("fill", ([comm]) => communityColor(String(comm)))
      .attr("fill-opacity", 0.08)
      .attr("stroke", ([comm]) => communityColor(String(comm)))
      .attr("stroke-opacity", 0.55)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "6 3")
      .attr("stroke-linejoin", "round");

    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll<SVGLineElement, Link>("line")
      .data(allLinks, (d) => `${nodeId(d.source)}-${nodeId(d.target)}`)
      .join("line")
      .attr("stroke", isDark ? "#999" : "#cbd5e1")
      .attr("stroke-opacity", (d) => (d.weight >= DEFAULT_MIN_WEIGHT ? 0.4 : 0))
      .attr("stroke-width", (d) => Math.max(1, d.weight * 4));

    const degree = new Map<string, number>();
    allLinks.forEach((l) => {
      if (l.weight >= DEFAULT_MIN_WEIGHT) {
        const { s, t } = linkId(l);
        degree.set(s, (degree.get(s) || 0) + 1);
        degree.set(t, (degree.get(t) || 0) + 1);
      }
    });
    const maxDegree = Math.max(...(degree.size ? degree.values() : [1]), 1);

    // defs block for avatar clip paths (one per avatar node)
    const defs = svg.append("defs");

    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, Node>("g")
      .data(nodes, (d) => d.id)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, Node>()
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

    // Per-node: avatar photo (clipped circle) or light-fill circle + initials
    node.each(function (d) {
      const sel = d3.select(this);
      const deg = degree.get(d.id) || 1;
      const r = 6 + (deg / maxDegree) * 14;

      if (d.avatar) {
        // Define a circular clip path unique to this node
        defs
          .append("clipPath")
          .attr("id", `avatar-clip-${d.id}`)
          .append("circle")
          .attr("r", r);

        // Stroke-only circle keeps the team-colour ring and participates in
        // highlight effects (useGraphEffects selects "circle")
        sel
          .append("circle")
          .attr("r", r)
          .attr("fill", "#ffffff")
          .attr("stroke", TEAM_COLORS[d.team] || "#94a3b8")
          .attr("stroke-width", 2.5);

        // Avatar image clipped to the circle
        sel
          .append("image")
          .attr("class", "node-avatar")
          .attr("href", d.avatar)
          .attr("x", -r + 0.5)
          .attr("y", -r + 0.5)
          .attr("width", r * 2 - 1)
          .attr("height", r * 2 - 1)
          .attr("clip-path", `url(#avatar-clip-${d.id})`)
          .attr("preserveAspectRatio", "xMidYMid slice")
          .attr("pointer-events", "none");
      } else {
        // Light-fill circle + initials (existing behaviour)
        sel
          .append("circle")
          .attr("r", r)
          .attr("fill", TEAM_LIGHT_FILL[d.team] || "#f8fafc")
          .attr("stroke", TEAM_COLORS[d.team] || "#94a3b8")
          .attr("stroke-width", 2.5);

        sel
          .append("text")
          .attr("class", "node-initials")
          .text(getInitials(d.name))
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "central")
          .attr("fill", TEAM_COLORS[d.team] || "#64748b")
          .attr("font-size", `${Math.max(7, Math.floor(r * 0.62))}px`)
          .attr("font-weight", "700")
          .attr("pointer-events", "none");
      }
    });

    // First-name label floating above the circle
    node
      .append("text")
      .attr("class", "node-label")
      .text((d) => d.name.split(" ")[0])
      .attr("dy", (d) => {
        const deg = degree.get(d.id) || 1;
        return -(8 + (deg / maxDegree) * 14);
      })
      .attr("text-anchor", "middle")
      .attr("fill", isDark ? "#e5e7eb" : "#334155")
      .attr("font-size", "11px")
      .attr("pointer-events", "none");

    // Hover tooltip
    const tooltip = svg
      .append("g")
      .attr("class", "tooltip")
      .attr("pointer-events", "none")
      .style("opacity", 0);

    tooltip
      .append("rect")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("fill", isDark ? "rgba(24,24,27,0.92)" : "rgba(255,255,255,0.97)")
      .attr("stroke", isDark ? "rgba(63,63,70,0.5)" : "rgba(203,213,225,0.9)");

    const tooltipName = tooltip
      .append("text")
      .attr("fill", isDark ? "#e5e7eb" : "#0f172a")
      .attr("font-size", "12px")
      .attr("font-weight", "600");

    const tooltipRole = tooltip
      .append("text")
      .attr("fill", isDark ? "#a1a1aa" : "#475569")
      .attr("font-size", "11px");

    const tooltipTeam = tooltip
      .append("text")
      .attr("fill", isDark ? "#71717a" : "#94a3b8")
      .attr("font-size", "10px");

    node
      .on("mouseenter", function (event, d) {
        setHovered(d.id);
        const [mx, my] = d3.pointer(event, svg.node()!);

        tooltipName.text(d.name);
        tooltipRole.text(d.role);
        tooltipTeam.text(
          d.team.charAt(0).toUpperCase() + d.team.slice(1) + " team",
        );

        const padX = 12;
        const padY = 8;
        const lineH = 16;
        const textW = Math.max(
          d.name.length * 7.2,
          d.role.length * 6.6,
          (d.team.length + 5) * 6,
        );
        const w = textW + padX * 2;
        const h = lineH * 3 + padY * 2;

        let tx = mx + 14;
        let ty = my - h - 8;
        const svgW = svgRef.current?.clientWidth || 800;
        if (tx + w > svgW - 10) tx = mx - w - 14;
        if (ty < 10) ty = my + 20;

        tooltip.attr("transform", `translate(${tx},${ty})`);
        tooltip.select("rect").attr("width", w).attr("height", h);
        tooltipName.attr("x", padX).attr("y", padY + lineH);
        tooltipRole.attr("x", padX).attr("y", padY + lineH * 2);
        tooltipTeam.attr("x", padX).attr("y", padY + lineH * 2.85);

        tooltip.transition().duration(150).style("opacity", 1);
      })
      .on("mouseleave", function () {
        setHovered(null);
        tooltip.transition().duration(150).style("opacity", 0);
      })
      .on("click", (_event, d) => {
        setSelected((prev) => (prev === d.id ? null : d.id));
      });

    simulation.on("tick", () => {
      if (clustering) {
        hullPaths.attr("d", ([, groupNodes]) => getHullPath(groupNodes, 50));
      }

      link
        .attr("x1", (d) => (d.source as Node).x!)
        .attr("y1", (d) => (d.source as Node).y!)
        .attr("x2", (d) => (d.target as Node).x!)
        .attr("y2", (d) => (d.target as Node).y!);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
      simRef.current = null;
    };
  }, [data, clustering, theme, svgRef, setSelected, setHovered]);

  return { gRef, simRef, nodesRef };
}
