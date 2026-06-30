import type { GraphLink } from "../../../scraper/src/types";
import {
  MAX_SUBPROJECT_SKILLS,
  MAX_TOP_CONTRIBUTORS,
  MIN_PROJECT_EDGE_WEIGHT,
} from "../config";
import type {
  ProjectGraphData,
  ProjectGraphNode,
  SkillRef,
  SkillsBuildResult,
  SubprojectEntry,
  SubprojectsData,
} from "../types";

function aggregateSubprojectSkills(
  sub: SubprojectEntry,
  byLogin: Record<string, SkillRef[]>,
  canonicalSkills: Set<string>
): SkillRef[] {
  const acc = new Map<string, number>();

  for (const [login, touchWeight] of Object.entries(sub.contributor_weights)) {
    for (const { id, weight } of byLogin[login] ?? []) {
      if (!canonicalSkills.has(id) || weight <= 0) continue;
      acc.set(id, (acc.get(id) ?? 0) + weight * touchWeight);
    }
  }

  const skills: SkillRef[] = [];
  for (const [id, weight] of acc) {
    if (weight > 0) skills.push({ id, weight });
  }

  skills.sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
  return skills.slice(0, MAX_SUBPROJECT_SKILLS);
}

function buildProjectNodes(
  subprojects: SubprojectsData,
  skillsResult: SkillsBuildResult
): ProjectGraphNode[] {
  const canonicalSkills = new Set(Object.keys(skillsResult.data.skills));
  const nodes: ProjectGraphNode[] = [];

  for (const [id, sub] of Object.entries(subprojects.subprojects)) {
    const top_contributors = Object.entries(sub.contributor_weights)
      .map(([login, weight]) => ({ login, weight }))
      .sort((a, b) => b.weight - a.weight || a.login.localeCompare(b.login))
      .slice(0, MAX_TOP_CONTRIBUTORS);

    nodes.push({
      id,
      name: sub.label,
      total_weight: sub.total_weight,
      contributor_count: Object.keys(sub.contributor_weights).length,
      sample_paths: sub.sample_paths,
      skills: aggregateSubprojectSkills(sub, skillsResult.byLogin, canonicalSkills),
      top_contributors,
    });
  }

  nodes.sort((a, b) => {
    if (b.total_weight !== a.total_weight) return b.total_weight - a.total_weight;
    return a.id.localeCompare(b.id);
  });

  return nodes;
}

function buildProjectLinks(subprojects: SubprojectsData): GraphLink[] {
  const ids = Object.keys(subprojects.subprojects);
  const links: GraphLink[] = [];

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const sId = ids[i];
      const tId = ids[j];
      const sWeights = subprojects.subprojects[sId].contributor_weights;
      const tWeights = subprojects.subprojects[tId].contributor_weights;

      let sharedWeight = 0;
      for (const [login, sWeight] of Object.entries(sWeights)) {
        const tWeight = tWeights[login];
        if (tWeight !== undefined) {
          sharedWeight += Math.min(sWeight, tWeight);
        }
      }

      if (sharedWeight < MIN_PROJECT_EDGE_WEIGHT) continue;

      const source = sId < tId ? sId : tId;
      const target = sId < tId ? tId : sId;
      links.push({ source, target, weight: sharedWeight });
    }
  }

  links.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    return a.target.localeCompare(b.target);
  });

  return links;
}

export function buildProjectGraph(
  repo: string,
  subprojects: SubprojectsData,
  skillsResult: SkillsBuildResult
): ProjectGraphData {
  return {
    repo,
    generated_at: new Date().toISOString(),
    nodes: buildProjectNodes(subprojects, skillsResult),
    links: buildProjectLinks(subprojects),
  };
}
