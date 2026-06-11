import { existsSync, readdirSync } from "fs";
import { dirname } from "path";
import { join } from "path";
import type { ManifestEntry } from "../../../scraper/src/types";
import { readJson } from "../io/json";
import type { ProvisionalSignal } from "./types";
import { slugify } from "./types";

export interface ManifestIndexEntry {
  sourcePath: string;
  prefix: string;
  deps: Record<string, string>;
}

function manifestDirPrefix(sourcePath: string): string {
  const dir = dirname(sourcePath);
  return dir === "." ? "" : dir;
}

function depId(depName: string): string {
  const normalized = depName.startsWith("@")
    ? depName.slice(1).replace(/\//g, "-")
    : depName;
  return `dep:${slugify(normalized)}`;
}

export function loadManifestIndex(cacheDir: string): ManifestIndexEntry[] {
  const manifestsDir = join(cacheDir, "manifests");
  if (!existsSync(manifestsDir)) return [];

  const entries: ManifestIndexEntry[] = [];

  for (const file of readdirSync(manifestsDir)) {
    if (!file.endsWith(".json")) continue;
    const entry = readJson<ManifestEntry>(join(manifestsDir, file));
    entries.push({
      sourcePath: entry.source_path,
      prefix: manifestDirPrefix(entry.source_path),
      deps: entry.deps,
    });
  }

  entries.sort((a, b) => b.prefix.length - a.prefix.length);
  return entries;
}

export function findManifestForPath(
  path: string,
  index: ManifestIndexEntry[]
): ManifestIndexEntry | null {
  let best: ManifestIndexEntry | null = null;

  for (const entry of index) {
    if (!entry.prefix) continue;
    if (path === entry.prefix || path.startsWith(entry.prefix + "/")) {
      if (!best || entry.prefix.length > best.prefix.length) {
        best = entry;
      }
    }
  }

  if (best) return best;

  return index.find((e) => e.prefix === "") ?? null;
}

export function signalsFromDeps(deps: Record<string, string>): ProvisionalSignal[] {
  return Object.keys(deps).map((name) => ({
    id: depId(name),
    label: name,
    source: "manifest" as const,
  }));
}

export function manifestsForPaths(
  paths: string[],
  index: ManifestIndexEntry[]
): ManifestIndexEntry[] {
  const seen = new Set<string>();
  const matched: ManifestIndexEntry[] = [];

  for (const rawPath of paths) {
    const normalized = rawPath.replace(/\/+/g, "/").replace(/^\.\//, "");
    const entry = findManifestForPath(normalized, index);
    if (!entry || seen.has(entry.sourcePath)) continue;
    seen.add(entry.sourcePath);
    matched.push(entry);
  }

  return matched;
}
