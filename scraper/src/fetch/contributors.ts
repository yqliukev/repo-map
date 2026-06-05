import type { Octokit } from "@octokit/rest";
import { isBot } from "../filters";
import type { ContributorStat, RawPR, RawReview } from "../types";

async function fetchProfile(
  octokit: Octokit,
  login: string
): Promise<ContributorStat | null> {
  try {
    const { data } = await octokit.rest.users.getByUsername({ username: login });
    return {
      login: data.login,
      name: data.name ?? null,
      avatar_url: data.avatar_url,
      total: 0, // filled in by caller
    };
  } catch {
    return null;
  }
}

// Simple promise concurrency limiter
async function withConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function fetchContributors(options: {
  octokit: Octokit;
  prs: RawPR[];
  reviews: RawReview[];
  concurrency: number;
  log: (msg: string) => void;
}): Promise<ContributorStat[]> {
  const { octokit, prs, reviews, concurrency, log } = options;

  // Build activity counts: bots already excluded from prs/reviews by earlier pass
  const activity = new Map<string, number>();
  for (const pr of prs) {
    activity.set(pr.author, (activity.get(pr.author) ?? 0) + 1);
  }
  for (const review of reviews) {
    if (!isBot(review.reviewer)) {
      activity.set(review.reviewer, (activity.get(review.reviewer) ?? 0) + 1);
    }
  }

  const logins = [...activity.keys()];
  log(`Fetching profiles for ${logins.length} unique contributors...`);

  const profiles = await withConcurrency(logins, concurrency, (login) =>
    fetchProfile(octokit, login)
  );

  const contributors: ContributorStat[] = [];
  for (let i = 0; i < logins.length; i++) {
    const profile = profiles[i];
    if (!profile) continue;
    profile.total = activity.get(logins[i]) ?? 0;
    contributors.push(profile);
  }

  // Sort descending by activity for readability
  contributors.sort((a, b) => b.total - a.total);
  return contributors;
}
