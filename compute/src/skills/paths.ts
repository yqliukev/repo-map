import { GENERIC_PATH_SEGMENTS, KNOWN_PATH_HINTS } from "../config";
import { normalizePath } from "../subprojects/normalize";
import type { ProvisionalSignal } from "./types";
import { slugify } from "./types";

function isHintSegment(segment: string): boolean {
  if (KNOWN_PATH_HINTS.has(segment)) return true;
  return segment.length >= 4 && /^[a-z][a-z0-9-]+$/.test(segment);
}

export function signalsFromPathSegments(
  paths: string[],
  excludeSegments: Set<string>
): ProvisionalSignal[] {
  const seen = new Set<string>();
  const signals: ProvisionalSignal[] = [];

  for (const rawPath of paths) {
    const normalized = normalizePath(rawPath);
    if (!normalized) continue;

    for (const segment of normalized.split("/")) {
      if (!segment || GENERIC_PATH_SEGMENTS.has(segment)) continue;
      if (excludeSegments.has(segment)) continue;
      if (!isHintSegment(segment)) continue;

      const id = `path:${slugify(segment)}`;
      if (seen.has(id)) continue;
      seen.add(id);

      signals.push({
        id,
        label: segment,
        source: "path",
      });
    }
  }

  return signals;
}
