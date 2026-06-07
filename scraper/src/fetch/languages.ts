import type { Octokit } from "@octokit/rest";

export async function fetchLanguages(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<Record<string, number>> {
  const { data } = await octokit.rest.repos.listLanguages({ owner, repo });
  return data;
}
