import type { GraphLink } from "../../scraper/src/types";
import type { SubprojectRules } from "./config";

export interface SubprojectEntry {
  label: string;
  total_weight: number;
  contributor_weights: Record<string, number>;
  sample_paths: string[];
}

export interface SubprojectsData {
  version: 1;
  generated_at: string;
  rules: SubprojectRules;
  subprojects: Record<string, SubprojectEntry>;
}

export interface SubprojectGraphFields {
  team: string;
  projects: string[];
  project_roles: Record<string, { weight: number; role: string }>;
}

export interface SkillEntry {
  label: string;
  kind?: string;
}

export interface SkillsData {
  version: 1;
  updated_at: string;
  skills: Record<string, SkillEntry>;
}

export interface SkillsBuildResult {
  data: SkillsData;
  byLogin: Record<string, SkillRef[]>;
}

export interface SkillRef {
  id: string;
  weight: number;
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
