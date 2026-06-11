import { existsSync, readdirSync } from "fs";
import { join } from "path";
import type { ContributorStat, ManifestEntry } from "../../../scraper/src/types";
import type { SkillsData, SubprojectsData } from "../types";
import { readJson, writeJson } from "./json";

export function readContributors(cacheDir: string): ContributorStat[] {
  return readJson<ContributorStat[]>(join(cacheDir, "contributors.json"));
}

export function readSubprojects(cacheDir: string): SubprojectsData | null {
  const path = join(cacheDir, "subprojects.json");
  if (!existsSync(path)) return null;
  return readJson<SubprojectsData>(path);
}

export function readLanguages(cacheDir: string): Record<string, number> | null {
  const path = join(cacheDir, "languages.json");
  if (!existsSync(path)) return null;
  return readJson<Record<string, number>>(path);
}

export function readManifests(cacheDir: string): Record<string, ManifestEntry> {
  const dir = join(cacheDir, "manifests");
  if (!existsSync(dir)) return {};

  const manifests: Record<string, ManifestEntry> = {};
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const key = file.replace(/\.json$/, "");
    manifests[key] = readJson<ManifestEntry>(join(dir, file));
  }
  return manifests;
}

export function writeSubprojects(cacheDir: string, data: SubprojectsData): string {
  const path = join(cacheDir, "subprojects.json");
  writeJson(path, data);
  return path;
}

export function writeSkills(cacheDir: string, data: SkillsData): string {
  const path = join(cacheDir, "skills.json");
  writeJson(path, data);
  return path;
}
