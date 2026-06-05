import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { repoToCacheDir } from "./paths";
import type { CacheMeta, ContributorStat, RawPR, RawReview } from "./types";

interface CachePayload {
  prs: RawPR[];
  reviews: RawReview[];
  contributors: ContributorStat[];
  meta: CacheMeta;
}

export function writeCache(repo: string, payload: CachePayload): string {
  const dir = repoToCacheDir(repo);
  mkdirSync(dir, { recursive: true });

  const write = (name: string, data: unknown) =>
    writeFileSync(join(dir, name), JSON.stringify(data, null, 2) + "\n", "utf8");

  write("prs.json", payload.prs);
  write("reviews.json", payload.reviews);
  write("contributors.json", payload.contributors);
  write("meta.json", payload.meta);

  return dir;
}
