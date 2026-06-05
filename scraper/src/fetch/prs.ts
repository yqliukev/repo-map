import type { Octokit } from "@octokit/rest";
import { isBot } from "../filters";
import type { PRFileChange, RawPR } from "../types";

interface FetchPRsOptions {
  octokit: Octokit;
  owner: string;
  repo: string;
  windowStart: Date;
  concurrency: number;
  log: (msg: string) => void;
}

interface PRsResult {
  prs: RawPR[];
}

async function fetchFilesForPR(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<PRFileChange[]> {
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });
  return files.map((f) => ({
    path: f.filename,
    additions: f.additions,
    deletions: f.deletions,
  }));
}

async function fetchReviewsForPR(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<Array<{ reviewer: string; submitted_at: string }>> {
  const reviews = await octokit.paginate(octokit.rest.pulls.listReviews, {
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });
  return reviews
    .filter((r) => r.state !== "DISMISSED" && r.user && !isBot(r.user.login))
    .map((r) => ({
      reviewer: r.user!.login,
      submitted_at: r.submitted_at ?? new Date(0).toISOString(),
    }));
}

// Simple promise concurrency limiter
async function withConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker()
  );
  await Promise.all(workers);
  return results;
}

export async function fetchPRs(
  options: FetchPRsOptions
): Promise<PRsResult & { reviewPairs: Array<{ pr_number: number; reviewer: string; submitted_at: string }> }> {
  const { octokit, owner, repo, windowStart, concurrency, log } = options;

  log(`Listing PRs for ${owner}/${repo} (window start: ${windowStart.toISOString()})...`);

  // Collect PR stubs via pagination with early stop
  const prStubs: Array<{
    number: number;
    title: string;
    author: string;
    created_at: string;
    labels: string[];
  }> = [];

  for await (const response of octokit.paginate.iterator(
    octokit.rest.pulls.list,
    {
      owner,
      repo,
      state: "all",
      sort: "created",
      direction: "desc",
      per_page: 100,
    }
  )) {
    let hitWindow = false;
    for (const pr of response.data) {
      if (new Date(pr.created_at) < windowStart) {
        hitWindow = true;
        break;
      }
      if (!pr.user || isBot(pr.user.login)) continue;
      prStubs.push({
        number: pr.number,
        title: pr.title,
        author: pr.user.login,
        created_at: pr.created_at,
        labels: pr.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")),
      });
    }
    if (hitWindow) break;
  }

  log(`Found ${prStubs.length} non-bot PRs in window. Fetching files + reviews...`);

  const reviewPairs: Array<{ pr_number: number; reviewer: string; submitted_at: string }> = [];

  const prs = await withConcurrency(prStubs, concurrency, async (stub, i) => {
    if ((i + 1) % 50 === 0) {
      log(`  ${i + 1}/${prStubs.length} PRs processed...`);
    }
    const [files, reviews] = await Promise.all([
      fetchFilesForPR(octokit, owner, repo, stub.number),
      fetchReviewsForPR(octokit, owner, repo, stub.number),
    ]);
    for (const r of reviews) {
      reviewPairs.push({ pr_number: stub.number, ...r });
    }
    return { ...stub, files };
  });

  return { prs, reviewPairs };
}
