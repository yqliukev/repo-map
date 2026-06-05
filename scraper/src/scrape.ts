import { REPOS } from "./config";
import { writeCache } from "./cache";
import { createOctokit } from "./github";
import { fetchPRs } from "./fetch/prs";
import { fetchContributors } from "./fetch/contributors";
import { getWindowStart } from "./window";
import type { RawReview } from "./types";

const CONCURRENCY = 8;

function log(repo: string, msg: string) {
  console.log(`[${repo}] ${msg}`);
}

async function scrapeRepo(repo: string): Promise<void> {
  const octokit = createOctokit();
  const [owner, repoName] = repo.split("/");
  const windowStart = getWindowStart();
  const start = Date.now();

  log(repo, `Starting scrape (window: ${windowStart.toISOString().slice(0, 10)} → now)`);

  const { prs, reviewPairs } = await fetchPRs({
    octokit,
    owner,
    repo: repoName,
    windowStart,
    concurrency: CONCURRENCY,
    log: (msg) => log(repo, msg),
  });

  const reviews: RawReview[] = reviewPairs.map((r) => ({
    pr_number: r.pr_number,
    reviewer: r.reviewer,
    submitted_at: r.submitted_at,
  }));

  const contributors = await fetchContributors({
    octokit,
    prs,
    reviews,
    concurrency: CONCURRENCY,
    log: (msg) => log(repo, msg),
  });

  const meta = {
    repo,
    scraped_at: new Date().toISOString(),
    window_start: windowStart.toISOString(),
    pr_count: prs.length,
    review_count: reviews.length,
  };

  const cacheDir = writeCache(repo, { prs, reviews, contributors, meta });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  log(
    repo,
    `Done — ${prs.length} PRs, ${reviews.length} reviews, ${contributors.length} contributors → ${cacheDir} (${elapsed}s)`
  );
}

async function main() {
  const args = process.argv.slice(2);
  const repoFlag = args.indexOf("--repo");
  const targets =
    repoFlag !== -1 && args[repoFlag + 1]
      ? [args[repoFlag + 1]]
      : REPOS;

  console.log(`Scraping ${targets.length} repo(s): ${targets.join(", ")}`);

  // Scrape repos sequentially to stay well within rate limits
  for (const repo of targets) {
    try {
      await scrapeRepo(repo);
    } catch (err) {
      console.error(`[${repo}] Failed:`, err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  }
}

main();
