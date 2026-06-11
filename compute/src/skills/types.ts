import type { SkillEntry, SkillsData } from "../types";

export type SignalSource = "extension" | "language" | "manifest" | "path";

export interface ProvisionalSignal {
  id: string;
  label: string;
  source: SignalSource;
}

export interface SignalHit {
  login: string;
  signal: ProvisionalSignal;
  weight: number;
  at: string;
}

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function skillKindFromId(id: string): string | undefined {
  if (id.startsWith("lang:")) return "language";
  if (id.startsWith("dep:")) return "dependency";
  if (id.startsWith("path:")) return undefined;
  return undefined;
}

export function skillEntryFromSignal(id: string, label: string): SkillEntry {
  const kind = skillKindFromId(id);
  return kind ? { label, kind } : { label };
}

export type { SkillEntry, SkillsData };
