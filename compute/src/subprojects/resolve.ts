import { getEnterDirs, type SubprojectRules } from "../config";
import { normalizePath } from "./normalize";

function isFilenameSegment(segment: string): boolean {
  return segment.includes(".");
}

export function resolveSubprojectId(path: string, rules: SubprojectRules): string | null {
  const normalized = normalizePath(path);
  if (!normalized) return null;

  const enterDirs = getEnterDirs(rules);
  const segments = normalized.split("/");

  while (segments.length > 0 && enterDirs.has(segments[0])) {
    segments.shift();
  }

  if (segments.length === 0) {
    return rules.root_bucket;
  }

  if (segments.length === 1 && isFilenameSegment(segments[0])) {
    return rules.root_bucket;
  }

  let depth = rules.default_depth;
  const first = segments[0];
  if (first in rules.nested_roots) {
    depth = rules.nested_roots[first];
  }

  const sliceEnd = Math.min(depth, segments.length);
  return segments.slice(0, sliceEnd).join("/");
}

export function subprojectLabel(id: string, rules: SubprojectRules): string {
  if (id === rules.root_bucket) return "Repository root";
  return id;
}
