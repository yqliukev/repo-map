import { isBot } from "../../../scraper/src/filters";
import type {
  ActivityData,
  ContributorStat,
  GraphData,
  GraphLink,
  GraphNode,
} from "../../../scraper/src/types";
import { MIN_ACTIVITY } from "../config";
import { subprojectFieldsForContributor } from "../subprojects/graph-fields";
import type { SkillsBuildResult, SubprojectsData } from "../types";

function activeContributors(contributors: ContributorStat[]): ContributorStat[] {
  return contributors
    .filter((c) => !isBot(c.login) && c.total >= MIN_ACTIVITY)
    .sort((a, b) => b.total - a.total || a.login.localeCompare(b.login));
}

function activityCounts(
  activity: ActivityData
): Map<string, { pr_count: number; review_count: number }> {
  const counts = new Map<string, { pr_count: number; review_count: number }>();

  for (const event of activity.events) {
    const login = event.login;
    let entry = counts.get(login);
    if (!entry) {
      entry = { pr_count: 0, review_count: 0 };
      counts.set(login, entry);
    }
    if (event.kind === "pr_author") {
      entry.pr_count += 1;
    } else {
      entry.review_count += 1;
    }
  }

  return counts;
}

function filterLinksForNodes(links: GraphLink[], nodeIds: Set<string>): GraphLink[] {
  return links.filter(
    (link) => nodeIds.has(link.source) && nodeIds.has(link.target)
  );
}

export function buildContributorGraph(
  repo: string,
  activity: ActivityData,
  contributors: ContributorStat[],
  subprojects: SubprojectsData,
  skillsResult: SkillsBuildResult,
  links: GraphLink[]
): GraphData {
  const active = activeContributors(contributors);
  const counts = activityCounts(activity);
  const nodeIds = new Set(active.map((c) => c.login));

  const nodes: GraphNode[] = active.map((c) => {
    const { team, projects, project_roles } = subprojectFieldsForContributor(
      subprojects,
      c.login
    );
    const activityCount = counts.get(c.login) ?? { pr_count: 0, review_count: 0 };
    const role = project_roles[team]?.role ?? "contributor";

    return {
      id: c.login,
      name: c.name ?? c.login,
      role,
      team,
      expertise: [],
      projects,
      project_roles,
      community: 0,
      avatar: c.avatar_url || undefined,
      pr_count: activityCount.pr_count,
      review_count: activityCount.review_count,
      skills: skillsResult.byLogin[c.login] ?? [],
    };
  });

  return {
    repo,
    generated_at: new Date().toISOString(),
    nodes,
    links: filterLinksForNodes(links, nodeIds),
  };
}
