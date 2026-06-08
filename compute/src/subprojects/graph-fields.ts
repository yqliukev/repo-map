import { SUBPROJECT_OWNER_THRESHOLD } from "../config";
import type { SubprojectGraphFields, SubprojectsData } from "../types";

export function subprojectFieldsForContributor(
  data: SubprojectsData,
  login: string
): SubprojectGraphFields {
  const entries: Array<{ id: string; weight: number; totalWeight: number }> = [];

  for (const [id, sub] of Object.entries(data.subprojects)) {
    const weight = sub.contributor_weights[login] ?? 0;
    if (weight > 0) {
      entries.push({ id, weight, totalWeight: sub.total_weight });
    }
  }

  entries.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    if (b.totalWeight !== a.totalWeight) return b.totalWeight - a.totalWeight;
    return a.id.localeCompare(b.id);
  });

  const personalTotal = entries.reduce((sum, e) => sum + e.weight, 0);
  const projects = entries.map((e) => e.id);

  const project_roles: SubprojectGraphFields["project_roles"] = {};
  for (const { id, weight } of entries) {
    const role =
      personalTotal > 0 && weight / personalTotal >= SUBPROJECT_OWNER_THRESHOLD
        ? "owner"
        : "contributor";
    project_roles[id] = { weight, role };
  }

  const team = entries[0]?.id ?? data.rules.root_bucket;

  return { team, projects, project_roles };
}
