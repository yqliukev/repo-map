import { existsSync } from "fs";
import { join } from "path";
import { COMPUTE_VERSION } from "../config";
import { repoToGraphDir } from "../paths";
import type { ComputeMetaData, ComputeMetaInputs } from "../types";
import { inputsMatch } from "./build";

export function stage3OutputsExist(cacheDir: string, repo: string): boolean {
  const graphDir = repoToGraphDir(repo);
  return (
    existsSync(join(cacheDir, "subprojects.json")) &&
    existsSync(join(cacheDir, "skills.json")) &&
    existsSync(join(cacheDir, "compute_meta.json")) &&
    existsSync(join(graphDir, "graph.json")) &&
    existsSync(join(graphDir, "project_graph.json")) &&
    existsSync(join(graphDir, "skills.json"))
  );
}

export function canSkipCompute(
  existing: ComputeMetaData | null,
  inputs: ComputeMetaInputs,
  cacheDir: string,
  repo: string
): boolean {
  if (!existing) return false;
  if (existing.compute_version !== COMPUTE_VERSION) return false;
  if (!inputsMatch(existing.inputs, inputs)) return false;
  return stage3OutputsExist(cacheDir, repo);
}
