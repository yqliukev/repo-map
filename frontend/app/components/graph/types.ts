import * as d3 from "d3";

// ── People graph ─────────────────────────────────────────────────────────────

export interface ProjectRole {
  weight: number;
  role: string;
}

export interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  role: string;
  team: string;
  expertise: string[];
  projects: string[];
  project_roles?: Record<string, ProjectRole>;
  skills_summary?: string;
  work_summary?: string;
  community?: number;
  avatar?: string;
}

export interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  weight: number;
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export interface RankedConnection {
  id: string;
  name: string;
  team: string;
  weight: number;
}

// ── Project graph ─────────────────────────────────────────────────────────────

export interface ProjectMember {
  id: string;
  name: string;
  team: string;
  weight: number;
  role: string;
}

export interface SharedPerson {
  id: string;
  name: string;
  team: string;
  weight_a: number;
  role_a: string;
  weight_b: number;
  role_b: string;
}

export interface ProjectInfo {
  id: string;
  /** Full LLM-generated name, e.g. "Auth Service Refactor (OAuth2 PKCE)" */
  name: string;
  /** Clean display name with parentheticals stripped, e.g. "Auth Service Refactor" */
  display_name: string;
  status: string;
  time_range: string;
  keywords: string[];
  member_count: number;
  members: ProjectMember[];
  /** LLM-generated 2-3 sentence description of the project */
  summary?: string;
}

export interface ConnectedProject {
  id: string;
  name: string;
  weight: number;
  shared_count: number;
  shared_people: SharedPerson[];
}

// ── Shared style constants ────────────────────────────────────────────────────

export const TEAM_COLORS: Record<string, string> = {
  backend: "#3b82f6",
  frontend: "#10b981",
  design: "#f59e0b",
  product: "#ef4444",
};

export const STATUS_COLORS: Record<string, string> = {
  active: "#22d3ee",
  completed: "#a78bfa",
};

export const ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  lead: { bg: "bg-indigo-500/20", text: "text-indigo-300" },
  core: { bg: "bg-emerald-500/20", text: "text-emerald-300" },
  contributor: { bg: "bg-zinc-600/50", text: "text-zinc-400" },
  peripheral: { bg: "bg-zinc-700/50", text: "text-zinc-500" },
};

export const TEAM_LIGHT_FILL: Record<string, string> = {
  backend: "#eff6ff",
  frontend: "#ecfdf5",
  design: "#fffbeb",
  product: "#fef2f2",
};

export const PROJECT_PALETTE = [
  "#818cf8",
  "#34d399",
  "#fb923c",
  "#e879f9",
  "#38bdf8",
  "#f87171",
  "#a3e635",
  "#fbbf24",
];

export const DEFAULT_MIN_WEIGHT = 0.4;
export const TRANSITION_MS = 400;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function nodeId(d: string | Node): string {
  return typeof d === "string" ? d : d.id;
}

export function linkId(l: Link): { s: string; t: string } {
  return { s: nodeId(l.source), t: nodeId(l.target) };
}

export function roleStyle(role: string): { bg: string; text: string } {
  return ROLE_STYLES[role.toLowerCase()] ?? ROLE_STYLES.contributor;
}
