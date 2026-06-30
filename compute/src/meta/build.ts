import { COMPUTE_VERSION } from "../config";
import type {
  ActivityData,
  CacheMeta,
} from "../../../scraper/src/types";
import type {
  ComputeMetaData,
  ComputeMetaInputs,
  SkillsData,
  SubprojectsData,
} from "../types";

export function buildComputeMetaInputs(
  cacheMeta: CacheMeta,
  activity: ActivityData
): ComputeMetaInputs {
  return {
    meta_scraped_at: cacheMeta.scraped_at,
    activity_generated_at: activity.generated_at,
    pr_count: cacheMeta.pr_count,
  };
}

export function inputsMatch(
  a: ComputeMetaInputs,
  b: ComputeMetaInputs
): boolean {
  return (
    a.meta_scraped_at === b.meta_scraped_at &&
    a.activity_generated_at === b.activity_generated_at &&
    a.pr_count === b.pr_count
  );
}

export function buildComputeMeta(
  inputs: ComputeMetaInputs,
  subprojects: SubprojectsData,
  skills: SkillsData,
  graphsAt: string
): ComputeMetaData {
  return {
    compute_version: COMPUTE_VERSION,
    generated_at: new Date().toISOString(),
    inputs,
    outputs: {
      subprojects_at: subprojects.generated_at,
      skills_at: skills.updated_at,
      graphs_at: graphsAt,
    },
  };
}
