import { existsSync } from "fs";
import { join } from "path";
import { isBot } from "../../../scraper/src/filters";
import type { ActivityData, ContributorStat } from "../../../scraper/src/types";
import {
  MAX_CANONICAL_SKILLS,
  MIN_ACTIVITY,
  MIN_DEP_HITS,
  MIN_SKILL_CONTRIBUTORS,
  MIN_SKILL_REPO_COUNT,
} from "../config";
import { readJson } from "../io/json";
import type { SkillsBuildResult, SkillsData, SubprojectsData } from "../types";
import { assignContributorSkills } from "./assign";
import { extractSignalHits } from "./extract";
import { loadManifestIndex } from "./manifests";
import { skillEntryFromSignal, slugify, type SignalHit } from "./types";

const LANGUAGE_BYTE_FRACTION = 0.01;
const MAX_REPO_LANGUAGES = 8;

function activeLogins(contributors: ContributorStat[]): Set<string> {
  return new Set(
    contributors
      .filter((c) => !isBot(c.login) && c.total >= MIN_ACTIVITY)
      .map((c) => c.login)
  );
}

function aggregateHits(hits: SignalHit[]): {
  repoCounts: Map<string, number>;
  repoLabels: Map<string, string>;
  contributorCounts: Map<string, Set<string>>;
  byLogin: Map<string, Map<string, number>>;
} {
  const repoCounts = new Map<string, number>();
  const repoLabels = new Map<string, string>();
  const contributorCounts = new Map<string, Set<string>>();
  const byLogin = new Map<string, Map<string, number>>();

  for (const hit of hits) {
    const { id, label } = hit.signal;
    repoCounts.set(id, (repoCounts.get(id) ?? 0) + hit.weight);
    repoLabels.set(id, label);

    let logins = contributorCounts.get(id);
    if (!logins) {
      logins = new Set();
      contributorCounts.set(id, logins);
    }
    logins.add(hit.login);

    let loginCounts = byLogin.get(hit.login);
    if (!loginCounts) {
      loginCounts = new Map();
      byLogin.set(hit.login, loginCounts);
    }
    loginCounts.set(id, (loginCounts.get(id) ?? 0) + hit.weight);
  }

  return { repoCounts, repoLabels, contributorCounts, byLogin };
}

function readLanguages(cacheDir: string): Record<string, number> | null {
  const path = join(cacheDir, "languages.json");
  if (!existsSync(path)) return null;
  return readJson<Record<string, number>>(path);
}

function languageSignals(
  languages: Record<string, number>
): Array<{ id: string; label: string }> {
  const total = Object.values(languages).reduce((sum, n) => sum + n, 0);
  if (total === 0) return [];

  const sorted = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const threshold = total * LANGUAGE_BYTE_FRACTION;
  const selected = new Set<string>();

  for (const [name] of sorted.slice(0, MAX_REPO_LANGUAGES)) {
    selected.add(name);
  }
  for (const [name, bytes] of sorted) {
    if (bytes >= threshold) selected.add(name);
  }

  return [...selected].map((name) => ({
    id: `lang:${slugify(name)}`,
    label: name,
  }));
}

function shouldPromote(
  id: string,
  count: number,
  contributorCount: number,
  fromLanguagesJson: boolean
): boolean {
  if (fromLanguagesJson && id.startsWith("lang:")) return true;

  const minCount = id.startsWith("dep:") ? MIN_DEP_HITS : MIN_SKILL_REPO_COUNT;
  if (count < minCount) return false;

  if (contributorCount < MIN_SKILL_CONTRIBUTORS) return false;

  return true;
}

function promoteSkills(
  repoCounts: Map<string, number>,
  repoLabels: Map<string, string>,
  contributorCounts: Map<string, Set<string>>,
  languageOnlyIds: Set<string>
): SkillsData["skills"] {
  const candidates: Array<{ id: string; count: number }> = [];

  for (const [id, count] of repoCounts) {
    const contributors = contributorCounts.get(id)?.size ?? 0;
    const fromLang = languageOnlyIds.has(id);
    if (!shouldPromote(id, count, contributors, fromLang)) continue;
    candidates.push({ id, count: fromLang && count === 0 ? 1 : count });
  }

  candidates.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  const kept = candidates.slice(0, MAX_CANONICAL_SKILLS);

  const skills: SkillsData["skills"] = {};
  for (const { id } of kept) {
    const label = repoLabels.get(id);
    if (!label) continue;
    skills[id] = skillEntryFromSignal(id, label);
  }

  return skills;
}

export function buildSkills(
  cacheDir: string,
  activity: ActivityData,
  contributors: ContributorStat[],
  subprojects?: SubprojectsData
): SkillsBuildResult {
  const active = activeLogins(contributors);
  const excludeSegments = new Set(
    subprojects ? Object.keys(subprojects.subprojects) : []
  );

  const manifestIndex = loadManifestIndex(cacheDir);
  const hits = extractSignalHits(activity, manifestIndex, active, excludeSegments);
  const { repoCounts, repoLabels, contributorCounts, byLogin } = aggregateHits(hits);

  const languageOnlyIds = new Set<string>();
  const languages = readLanguages(cacheDir);
  if (languages) {
    for (const { id, label } of languageSignals(languages)) {
      if (!repoCounts.has(id)) {
        languageOnlyIds.add(id);
        repoCounts.set(id, 0);
        contributorCounts.set(id, new Set());
      }
      repoLabels.set(id, label);
    }
  }

  const skills = promoteSkills(
    repoCounts,
    repoLabels,
    contributorCounts,
    languageOnlyIds
  );

  const data: SkillsData = {
    version: 1,
    updated_at: new Date().toISOString(),
    skills,
  };

  const byLoginAssigned = assignContributorSkills(data, byLogin, active);

  return { data, byLogin: byLoginAssigned };
}
