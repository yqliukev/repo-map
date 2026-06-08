import { join } from "path";
import type { ContributorStat } from "../../../scraper/src/types";
import type { SubprojectsData } from "../types";
import { readJson, writeJson } from "./json";

export function readContributors(cacheDir: string): ContributorStat[] {
  return readJson<ContributorStat[]>(join(cacheDir, "contributors.json"));
}

export function writeSubprojects(cacheDir: string, data: SubprojectsData): string {
  const path = join(cacheDir, "subprojects.json");
  writeJson(path, data);
  return path;
}
