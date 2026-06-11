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

// ── Skills (D3) ───────────────────────────────────────────────────────────────

export const MIN_SKILL_REPO_COUNT = 3;
export const MIN_SKILL_CONTRIBUTORS = 2;
export const MAX_CANONICAL_SKILLS = 150;
export const MIN_DEP_HITS = 2;
export const MAX_CONTRIBUTOR_SKILLS = 20;

export const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  go: "Go",
  rs: "Rust",
  py: "Python",
  pyi: "Python",
  java: "Java",
  c: "C",
  h: "C",
  cpp: "C++",
  cc: "C++",
  cxx: "C++",
  hpp: "C++",
  cs: "C#",
  rb: "Ruby",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin",
  kts: "Kotlin",
  scala: "Scala",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  yaml: "YAML",
  yml: "YAML",
  json: "JSON",
  md: "Markdown",
  markdown: "Markdown",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  less: "Less",
  sql: "SQL",
  lua: "Lua",
  r: "R",
  dart: "Dart",
  vue: "Vue",
  svelte: "Svelte",
  toml: "TOML",
  dockerfile: "Dockerfile",
};

export const SKIP_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "ico",
  "webp",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "lock",
  "sum",
  "map",
  "min",
]);

export const GENERIC_PATH_SEGMENTS = new Set([
  ...DEFAULT_ENTER_DIRS,
  "test",
  "tests",
  "docs",
  "doc",
  "ci",
  "scripts",
  "script",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "out",
  "bin",
  "obj",
  "target",
  "tmp",
  "temp",
  "public",
  "static",
  "assets",
  "examples",
  "example",
  "benchmarks",
  "bench",
  "_root",
]);

export const KNOWN_PATH_HINTS = new Set([
  "docker",
  "terraform",
  "webpack",
  "eslint",
  "kubernetes",
  "k8s",
  "redis",
  "wasm",
  "graphql",
  "grpc",
  "postgres",
  "mysql",
  "sqlite",
  "nginx",
  "ansible",
  "pulumi",
  "babel",
  "rollup",
  "vite",
  "jest",
  "mocha",
  "cypress",
  "playwright",
  "prometheus",
  "grafana",
  "kafka",
  "rabbitmq",
  "elastic",
  "solr",
  "mongo",
  "mongodb",
]);
