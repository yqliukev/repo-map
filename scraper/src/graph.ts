import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import { RawPR, RawReview, ContributorStat, GraphNode, GraphLink, GraphData } from "./types";
import { detectSubsystem } from "./subsystems";
import { LAMBDA, REVIEW_WEIGHT } from "./config";

function recencyDecay(dateStr: string, refDate: Date): number {
  const days = (refDate.getTime() - new Date(dateStr).getTime()) / 86400000;
  return Math.exp(-LAMBDA * Math.max(0, days));
}

function topKeywords(titles: string[], n = 6): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "be", "fix", "add",
    "update", "remove", "refactor", "bump", "use", "not", "this", "that",
    "it", "its", "into", "when", "some", "also", "all", "new", "via",
    "make", "allow", "do", "get", "set", "support", "improve", "initial",
  ]);

  const freq = new Map<string, number>();
  const words = titles.join(" ").toLowerCase().match(/\b[a-z][a-z0-9-]{2,}\b/g) ?? [];
  for (const w of words) {
    if (!stopWords.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term]) => term);
}

function assignRole(weight: number, allWeights: number[]): string {
  const sorted = [...allWeights].sort((a, b) => b - a);
  const rank = sorted.findIndex((w) => w <= weight);
  const pct = rank / sorted.length;
  if (pct < 0.1) return "lead";
  if (pct < 0.3) return "core";
  if (pct < 0.7) return "contributor";
  return "peripheral";
}

export function buildGraph(
  repo: string,
  prs: RawPR[],
  reviews: RawReview[],
  contributors: ContributorStat[],
  active: Set<string>,
  refDate: Date
): GraphData {
  // Index: pr_number → reviews
  const reviewsByPR = new Map<number, RawReview[]>();
  for (const r of reviews) {
    if (!reviewsByPR.has(r.pr_number)) reviewsByPR.set(r.pr_number, []);
    reviewsByPR.get(r.pr_number)!.push(r);
  }

  // Avatar + display info from contributor stats
  const avatarMap = new Map<string, string>();
  for (const c of contributors) {
    if (c.avatar_url) avatarMap.set(c.login, c.avatar_url);
  }

  // Per-person accumulators
  const subsystemWeights = new Map<string, Map<string, number>>();
  const prTitles = new Map<string, string[]>();
  const prCount = new Map<string, number>();
  const reviewCount = new Map<string, number>();
  const edges = new Map<string, number>(); // "a::b" → weight

  for (const pr of prs) {
    if (!active.has(pr.author)) continue;

    const decay = recencyDecay(pr.created_at, refDate);
    const subsystem = detectSubsystem(pr.title, pr.labels);

    // Subsystem weight
    if (!subsystemWeights.has(pr.author)) subsystemWeights.set(pr.author, new Map());
    const sw = subsystemWeights.get(pr.author)!;
    sw.set(subsystem, (sw.get(subsystem) ?? 0) + decay);

    // PR title for keyword extraction
    if (!prTitles.has(pr.author)) prTitles.set(pr.author, []);
    prTitles.get(pr.author)!.push(pr.title);

    prCount.set(pr.author, (prCount.get(pr.author) ?? 0) + 1);

    // Review edges: author ↔ reviewer
    for (const review of reviewsByPR.get(pr.number) ?? []) {
      if (!active.has(review.reviewer) || review.reviewer === pr.author) continue;
      reviewCount.set(review.reviewer, (reviewCount.get(review.reviewer) ?? 0) + 1);

      const [a, b] = [pr.author, review.reviewer].sort();
      const key = `${a}::${b}`;
      edges.set(key, (edges.get(key) ?? 0) + REVIEW_WEIGHT * decay);
    }
  }

  // All people who appear in at least one PR or review
  const nodeIds = [...active].filter(
    (id) => prCount.has(id) || reviewCount.has(id)
  );

  // Build graphology graph
  const graph = new Graph({ type: "undirected" });
  for (const id of nodeIds) graph.addNode(id);

  for (const [key, weight] of edges) {
    const [a, b] = key.split("::");
    if (!graph.hasNode(a) || !graph.hasNode(b)) continue;
    if (graph.hasEdge(a, b)) {
      graph.updateEdgeAttribute(a, b, "weight", (w) => (w ?? 0) + weight);
    } else {
      graph.addEdge(a, b, { weight });
    }
  }

  // Community detection (Louvain)
  let communities: Record<string, number> = {};
  try {
    communities = louvain(graph, { getEdgeWeight: "weight" });
  } catch {
    for (const id of nodeIds) communities[id] = 0;
  }

  // Collect all weights per subsystem for percentile-based role assignment
  const subsystemAllWeights = new Map<string, number[]>();
  for (const swMap of subsystemWeights.values()) {
    for (const [sub, w] of swMap) {
      if (!subsystemAllWeights.has(sub)) subsystemAllWeights.set(sub, []);
      subsystemAllWeights.get(sub)!.push(w);
    }
  }

  const maxEdgeWeight = Math.max(...(edges.size ? edges.values() : [1]), 1);

  const nodes: GraphNode[] = nodeIds.map((id) => {
    const swMap = subsystemWeights.get(id) ?? new Map<string, number>();
    const topSubs = [...swMap.entries()].sort((a, b) => b[1] - a[1]);
    const maxW = topSubs[0]?.[1] ?? 1;

    const projectRoles: Record<string, { weight: number; role: string }> = {};
    const projectsList: string[] = [];

    for (const [sub, w] of topSubs.slice(0, 8)) {
      const normalized = w / maxW;
      const allW = subsystemAllWeights.get(sub) ?? [w];
      projectRoles[sub] = { weight: parseFloat(normalized.toFixed(3)), role: assignRole(w, allW) };
      projectsList.push(sub);
    }

    return {
      id,
      name: id, // GitHub login — display name not available from PR API
      role: "Contributor",
      team: topSubs[0]?.[0] ?? "general",
      expertise: topKeywords(prTitles.get(id) ?? []),
      projects: projectsList,
      project_roles: projectRoles,
      community: communities[id] ?? 0,
      avatar: avatarMap.get(id),
      pr_count: prCount.get(id) ?? 0,
      review_count: reviewCount.get(id) ?? 0,
    };
  });

  const links: GraphLink[] = [];
  for (const [key, weight] of edges) {
    const [source, target] = key.split("::");
    if (!graph.hasNode(source) || !graph.hasNode(target)) continue;
    links.push({
      source,
      target,
      weight: parseFloat((weight / maxEdgeWeight).toFixed(4)),
    });
  }

  return {
    repo,
    generated_at: new Date().toISOString(),
    nodes,
    links,
  };
}
