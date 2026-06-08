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
