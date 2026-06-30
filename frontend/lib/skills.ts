import type { SkillRef, SkillsData } from "./types";

export interface TechnologyItem {
  id: string;
  label: string;
  kind?: string;
  weight: number;
}

export interface TechnologyGroup {
  title: string;
  items: TechnologyItem[];
}

export function resolveNodeTechnologies(
  skills: SkillsData | undefined,
  skillRefs: SkillRef[]
): TechnologyGroup[] {
  if (!skills || skillRefs.length === 0) return [];

  const items: TechnologyItem[] = [];

  for (const ref of skillRefs) {
    const entry = skills.skills[ref.id];
    if (!entry) continue;
    items.push({
      id: ref.id,
      label: entry.label,
      kind: entry.kind,
      weight: ref.weight,
    });
  }

  items.sort((a, b) => b.weight - a.weight);

  const languages = items.filter((i) => i.kind === "language");
  const dependencies = items.filter((i) => i.kind === "dependency");
  const other = items.filter((i) => i.kind !== "language" && i.kind !== "dependency");

  const groups: TechnologyGroup[] = [];
  if (languages.length > 0) groups.push({ title: "Languages", items: languages });
  if (dependencies.length > 0) groups.push({ title: "Dependencies", items: dependencies });
  if (other.length > 0) groups.push({ title: "Other", items: other });

  return groups;
}
