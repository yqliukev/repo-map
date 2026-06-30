import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import {
  cacheDirForSlug,
  getCacheDir,
  graphDirForSlug,
  isValidSlug,
  slugToRepo,
} from "./paths";
import type {
  CacheMeta,
  ComputeMetaData,
  GraphData,
  ProjectGraphData,
  RepoBundle,
  RepoReadiness,
  RepoSummary,
  SkillsData,
} from "./types";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function checkReadiness(slug: string): RepoReadiness {
  const cacheDir = cacheDirForSlug(slug);
  const graphDir = graphDirForSlug(slug);

  return {
    enriched: existsSync(join(cacheDir, "activity.json")),
    computed:
      existsSync(join(cacheDir, "subprojects.json")) &&
      existsSync(join(cacheDir, "skills.json")) &&
      existsSync(join(cacheDir, "compute_meta.json")),
    graphs: existsSync(join(graphDir, "graph.json")),
  };
}

export function listCachedRepos(): RepoSummary[] {
  const cacheDir = getCacheDir();
  if (!existsSync(cacheDir)) return [];

  const summaries: RepoSummary[] = [];

  for (const entry of readdirSync(cacheDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const slug = entry.name;
    const metaPath = join(cacheDir, slug, "meta.json");
    if (!existsSync(metaPath)) continue;

    const meta = readJson<CacheMeta>(metaPath);
    const readiness = checkReadiness(slug);

    let graphs_at: string | undefined;
    const computeMetaPath = join(cacheDir, slug, "compute_meta.json");
    if (existsSync(computeMetaPath)) {
      const computeMeta = readJson<ComputeMetaData>(computeMetaPath);
      graphs_at = computeMeta.outputs.graphs_at;
    }

    summaries.push({
      slug,
      repo: meta.repo || slugToRepo(slug),
      scraped_at: meta.scraped_at,
      pr_count: meta.pr_count,
      readiness,
      graphs_at,
    });
  }

  return summaries.sort((a, b) => a.repo.localeCompare(b.repo));
}

export function loadRepoBundle(slug: string): RepoBundle {
  if (!isValidSlug(slug)) {
    throw new RepoError("Invalid slug", 400);
  }

  const cacheDir = cacheDirForSlug(slug);
  if (!existsSync(cacheDir)) {
    throw new RepoError("Repository not found", 404);
  }

  const metaPath = join(cacheDir, "meta.json");
  if (!existsSync(metaPath)) {
    throw new RepoError("Repository has no scrape metadata", 422);
  }

  const meta = readJson<CacheMeta>(metaPath);
  const readiness = checkReadiness(slug);

  let computeMeta: ComputeMetaData | undefined;
  const computeMetaPath = join(cacheDir, "compute_meta.json");
  if (existsSync(computeMetaPath)) {
    computeMeta = readJson<ComputeMetaData>(computeMetaPath);
  }

  const bundle: RepoBundle = {
    slug,
    repo: meta.repo || slugToRepo(slug),
    meta,
    computeMeta,
    readiness,
  };

  if (readiness.graphs) {
    const graphDir = graphDirForSlug(slug);
    bundle.graph = readJson<GraphData>(join(graphDir, "graph.json"));
    bundle.projectGraph = readJson<ProjectGraphData>(
      join(graphDir, "project_graph.json")
    );
    bundle.skills = readJson<SkillsData>(join(graphDir, "skills.json"));
  }

  return bundle;
}

export class RepoError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "RepoError";
  }
}
