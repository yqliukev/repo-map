import { EXT_TO_LANGUAGE, SKIP_EXTENSIONS } from "../config";
import type { ProvisionalSignal } from "./types";
import { slugify } from "./types";

export function signalsFromPath(path: string): ProvisionalSignal[] {
  const dot = path.lastIndexOf(".");
  if (dot === -1 || dot === path.length - 1) return [];

  const ext = path.slice(dot + 1).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) return [];

  const language = EXT_TO_LANGUAGE[ext];
  if (!language) return [];

  const slug = slugify(language);
  return [
    {
      id: `lang:${slug}`,
      label: language,
      source: "extension",
    },
  ];
}

export function signalsFromPaths(paths: string[]): ProvisionalSignal[] {
  const seen = new Set<string>();
  const signals: ProvisionalSignal[] = [];

  for (const path of paths) {
    for (const signal of signalsFromPath(path)) {
      if (seen.has(signal.id)) continue;
      seen.add(signal.id);
      signals.push(signal);
    }
  }

  return signals;
}
