// Self-contained copies of scraper/compute types used by the frontend API.

export interface CacheMeta {
  repo: string;
  scraped_at: string;
  window_start: string;
  pr_count: number;
  review_count: number;
}

export interface SkillRef {
  id: string;
  weight: number;
}

export interface GraphNode {
  id: string;
  name: string;
  role: string;
  team: string;
  expertise: string[];
  projects: string[];
  project_roles: Record<string, { weight: number; role: string }>;
  community: number;
  avatar?: string;
  pr_count: number;
  review_count: number;
  skills: SkillRef[];
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

export interface SkillEntry {
  label: string;
  kind?: string;
}

export interface SkillsData {
  version: number;
  updated_at: string;
  skills: Record<string, SkillEntry>;
}

export interface ProjectGraphNode {
  id: string;
  name: string;
  total_weight: number;
  contributor_count: number;
  sample_paths: string[];
  skills: SkillRef[];
  top_contributors: Array<{ login: string; weight: number }>;
}

export interface ProjectGraphData {
  repo: string;
  generated_at: string;
  nodes: ProjectGraphNode[];
  links: GraphLink[];
}

export interface ComputeMetaInputs {
  meta_scraped_at: string;
  activity_generated_at: string;
  pr_count: number;
}

export interface ComputeMetaOutputs {
  subprojects_at: string;
  skills_at: string;
  graphs_at: string;
}

export interface ComputeMetaData {
  compute_version: number;
  generated_at: string;
  inputs: ComputeMetaInputs;
  outputs: ComputeMetaOutputs;
}

export interface RepoReadiness {
  enriched: boolean;
  computed: boolean;
  graphs: boolean;
}

export interface RepoSummary {
  slug: string;
  repo: string;
  scraped_at: string;
  pr_count: number;
  readiness: RepoReadiness;
  graphs_at?: string;
}

export interface RepoBundle {
  slug: string;
  repo: string;
  meta: CacheMeta;
  computeMeta?: ComputeMetaData;
  readiness: RepoReadiness;
  graph?: GraphData;
  projectGraph?: ProjectGraphData;
  skills?: SkillsData;
}
