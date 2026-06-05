// ── Scraper-internal types ────────────────────────────────────────────────────

export interface PRFileChange {
  path: string;
  additions: number;
  deletions: number;
}

export interface RawPR {
  number: number;
  title: string;
  author: string;
  created_at: string;
  labels: string[];
  files: PRFileChange[];
}

export interface CacheMeta {
  repo: string;
  scraped_at: string;
  window_start: string;
  pr_count: number;
  review_count: number;
}

export interface RawReview {
  pr_number: number;
  reviewer: string;
  submitted_at: string;
}

export interface ContributorStat {
  login: string;
  name: string | null;
  avatar_url: string;
  total: number; // commits within the time window
}

// ── Graph output types (compatible with frontend schema) ──────────────────────

export interface GraphNode {
  id: string;
  name: string;
  role: string;
  team: string; // primary subsystem
  expertise: string[]; // TF-IDF keywords from PR titles
  projects: string[]; // subsystem IDs, ordered by weight
  project_roles: Record<string, { weight: number; role: string }>;
  community: number;
  avatar?: string;
  pr_count: number;
  review_count: number;
}

export interface GraphLink {
  source: string;
  target: string;
  weight: number;
}

export interface GraphData {
  repo: string;
  generated_at: string;
  nodes: GraphNode[];
  links: GraphLink[];
}
