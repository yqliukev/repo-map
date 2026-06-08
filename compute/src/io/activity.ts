import { existsSync } from "fs";
import { join } from "path";
import { buildActivity } from "../../../scraper/src/fetch/activity";
import type { ActivityData, RawPR, RawReview } from "../../../scraper/src/types";
import { readJson, writeJson } from "./json";

export function ensureActivity(cacheDir: string): ActivityData {
  const activityPath = join(cacheDir, "activity.json");
  if (existsSync(activityPath)) {
    return readJson<ActivityData>(activityPath);
  }

  const prsPath = join(cacheDir, "prs.json");
  const reviewsPath = join(cacheDir, "reviews.json");

  if (!existsSync(prsPath) || !existsSync(reviewsPath)) {
    throw new Error(
      `Missing activity.json and Stage 1 cache in ${cacheDir}. Run scraper first.`
    );
  }

  const prs = readJson<RawPR[]>(prsPath);
  const reviews = readJson<RawReview[]>(reviewsPath);
  const activity = buildActivity(prs, reviews);
  writeJson(activityPath, activity);
  return activity;
}
