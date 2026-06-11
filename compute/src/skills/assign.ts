import { MAX_CONTRIBUTOR_SKILLS } from "../config";
import type { SkillRef, SkillsData } from "../types";

export function assignContributorSkills(
  data: SkillsData,
  byLogin: Map<string, Map<string, number>>,
  activeLogins: Set<string>
): Record<string, SkillRef[]> {
  const result: Record<string, SkillRef[]> = {};
  const canonical = new Set(Object.keys(data.skills));

  for (const login of activeLogins) {
    const counts = byLogin.get(login);
    if (!counts) continue;

    const skills: SkillRef[] = [];
    for (const [id, weight] of counts) {
      if (!canonical.has(id) || weight <= 0) continue;
      skills.push({ id, weight });
    }

    skills.sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
    if (skills.length > 0) {
      result[login] = skills.slice(0, MAX_CONTRIBUTOR_SKILLS);
    }
  }

  return result;
}
