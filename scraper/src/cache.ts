import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { repoToCacheDir } from "./paths";
import type {
  ActivityData,
  CacheMeta,
  ContributorStat,
  ManifestEntry,
  RawPR,
  RawReview,
} from "./types";

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

interface EnrichCachePayload {
  languages: Record<string, number>;
  manifests: Record<string, ManifestEntry>;
  activity: ActivityData;
}

export function writeEnrichCache(repo: string, payload: EnrichCachePayload): string {
  const dir = repoToCacheDir(repo);
  mkdirSync(dir, { recursive: true });

  const write = (name: string, data: unknown) =>
    writeFileSync(join(dir, name), JSON.stringify(data, null, 2) + "\n", "utf8");

  write("languages.json", payload.languages);

  const manifestsDir = join(dir, "manifests");
  mkdirSync(manifestsDir, { recursive: true });
  for (const [key, entry] of Object.entries(payload.manifests)) {
    writeFileSync(
      join(manifestsDir, `${key}.json`),
      JSON.stringify(entry, null, 2) + "\n",
      "utf8"
    );
  }

  write("activity.json", payload.activity);

  return dir;
}
