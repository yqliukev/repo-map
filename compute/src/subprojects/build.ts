import { isBot } from "../../../scraper/src/filters";
import type { ActivityData, ContributorStat } from "../../../scraper/src/types";
import {
  getSubprojectRules,
  MIN_ACTIVITY,
  MIN_SUBPROJECT_WEIGHT,
  type SubprojectRules,
} from "../config";
import type { SubprojectsData } from "../types";
import { normalizePath } from "./normalize";
import { resolveSubprojectId, subprojectLabel } from "./resolve";

const MAX_SAMPLE_PATHS = 10;

interface Accumulator {
  contributorWeights: Map<string, Map<string, number>>;
  subprojectTotals: Map<string, number>;
  pathSamples: Map<string, Set<string>>;
}

function createAccumulator(): Accumulator {
  return {
    contributorWeights: new Map(),
    subprojectTotals: new Map(),
    pathSamples: new Map(),
  };
}

function addTouch(
  acc: Accumulator,
  subprojectId: string,
  login: string,
  path: string
): void {
  let byLogin = acc.contributorWeights.get(subprojectId);
  if (!byLogin) {
    byLogin = new Map();
    acc.contributorWeights.set(subprojectId, byLogin);
  }
  byLogin.set(login, (byLogin.get(login) ?? 0) + 1);
  acc.subprojectTotals.set(subprojectId, (acc.subprojectTotals.get(subprojectId) ?? 0) + 1);

  let samples = acc.pathSamples.get(subprojectId);
  if (!samples) {
    samples = new Set();
    acc.pathSamples.set(subprojectId, samples);
  }
  if (samples.size < MAX_SAMPLE_PATHS) {
    samples.add(path);
  }
}

function activeLogins(contributors: ContributorStat[]): Set<string> {
  return new Set(
    contributors
      .filter((c) => !isBot(c.login) && c.total >= MIN_ACTIVITY)
      .map((c) => c.login)
  );
}

function pruneSubprojects(
  acc: Accumulator,
  rules: SubprojectRules
): void {
  const root = rules.root_bucket;
  const prunedIds: string[] = [];

  for (const [id, total] of acc.subprojectTotals) {
    if (id === root) continue;
    if (total < MIN_SUBPROJECT_WEIGHT) {
      prunedIds.push(id);
    }
  }

  for (const id of prunedIds) {
    const byLogin = acc.contributorWeights.get(id);
    if (byLogin) {
      let rootByLogin = acc.contributorWeights.get(root);
      if (!rootByLogin) {
        rootByLogin = new Map();
        acc.contributorWeights.set(root, rootByLogin);
      }
      for (const [login, weight] of byLogin) {
        rootByLogin.set(login, (rootByLogin.get(login) ?? 0) + weight);
      }
    }

    const total = acc.subprojectTotals.get(id) ?? 0;
    acc.subprojectTotals.set(root, (acc.subprojectTotals.get(root) ?? 0) + total);

    const samples = acc.pathSamples.get(id);
    if (samples) {
      let rootSamples = acc.pathSamples.get(root);
      if (!rootSamples) {
        rootSamples = new Set();
        acc.pathSamples.set(root, rootSamples);
      }
      for (const p of samples) {
        if (rootSamples.size < MAX_SAMPLE_PATHS) {
          rootSamples.add(p);
        }
      }
    }

    acc.contributorWeights.delete(id);
    acc.subprojectTotals.delete(id);
    acc.pathSamples.delete(id);
  }
}

function toSubprojectsData(
  repo: string,
  rules: SubprojectRules,
  acc: Accumulator,
  active: Set<string>
): SubprojectsData {
  const subprojects: SubprojectsData["subprojects"] = {};

  for (const [id, total] of acc.subprojectTotals) {
    const rawByLogin = acc.contributorWeights.get(id) ?? new Map();
    const contributor_weights: Record<string, number> = {};

    for (const [login, weight] of rawByLogin) {
      if (active.has(login) && weight > 0) {
        contributor_weights[login] = weight;
      }
    }

    if (Object.keys(contributor_weights).length === 0 && id !== rules.root_bucket) {
      continue;
    }

    subprojects[id] = {
      label: subprojectLabel(id, rules),
      total_weight: total,
      contributor_weights,
      sample_paths: [...(acc.pathSamples.get(id) ?? [])],
    };
  }

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    rules,
    subprojects,
  };
}

export function buildSubprojects(
  repo: string,
  activity: ActivityData,
  contributors: ContributorStat[]
): SubprojectsData {
  const rules = getSubprojectRules(repo);
  const active = activeLogins(contributors);
  const acc = createAccumulator();

  for (const event of activity.events) {
    if (event.kind !== "pr_author") continue;
    if (!active.has(event.login)) continue;

    const seenPaths = new Set<string>();
    for (const rawPath of event.paths) {
      const normalized = normalizePath(rawPath);
      if (!normalized || seenPaths.has(normalized)) continue;
      seenPaths.add(normalized);

      const subprojectId = resolveSubprojectId(rawPath, rules);
      if (!subprojectId) continue;

      addTouch(acc, subprojectId, event.login, normalized);
    }
  }

  pruneSubprojects(acc, rules);

  return toSubprojectsData(repo, rules, acc, active);
}
