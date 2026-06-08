export const MIN_ACTIVITY = 3;

export const DEFAULT_ENTER_DIRS = ["src", "lib", "internal"] as const;

export const MIN_SUBPROJECT_WEIGHT = 5;
export const SUBPROJECT_OWNER_THRESHOLD = 0.4;

export interface SubprojectRules {
  default_depth: number;
  root_bucket: string;
  nested_roots: Record<string, number>;
  extra_enter_dirs?: string[];
}

export const DEFAULT_SUBPROJECT_RULES: SubprojectRules = {
  default_depth: 1,
  root_bucket: "_root",
  nested_roots: {},
};

export const SUBPROJECT_RULES_BY_REPO: Record<string, SubprojectRules> = {
  "facebook/react": {
    default_depth: 1,
    root_bucket: "_root",
    nested_roots: { packages: 2 },
  },
  "microsoft/vscode": {
    default_depth: 1,
    root_bucket: "_root",
    nested_roots: { vs: 2 },
  },
  "kubernetes/kubernetes": {
    default_depth: 1,
    root_bucket: "_root",
    nested_roots: { pkg: 2, staging: 2 },
  },
  "redis/redis": DEFAULT_SUBPROJECT_RULES,
  "rust-lang/rust": DEFAULT_SUBPROJECT_RULES,
};

export function getSubprojectRules(repo: string): SubprojectRules {
  return SUBPROJECT_RULES_BY_REPO[repo] ?? DEFAULT_SUBPROJECT_RULES;
}

export function getEnterDirs(rules: SubprojectRules): Set<string> {
  const dirs = new Set<string>(DEFAULT_ENTER_DIRS);
  for (const d of rules.extra_enter_dirs ?? []) {
    dirs.add(d);
  }
  return dirs;
}
