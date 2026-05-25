import { Octokit } from "@octokit/rest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { RawPR, RawReview, ContributorStat } from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_ROOT = path.join(__dirname, "../../cache");

function cacheDir(repoSlug: string): string {
  const dir = path.join(CACHE_ROOT, repoSlug.replace("/", "_"));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readCache<T>(file: string): T | null {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

function writeCache(file: string, data: unknown): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private dir: string;

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
    this.dir = cacheDir(`${owner}/${repo}`);
  }

  async fetchPRs(since: Date): Promise<RawPR[]> {
    const file = path.join(this.dir, "prs.json");
    const cached = readCache<RawPR[]>(file);
    if (cached) {
      console.log(`  [cache] ${cached.length} PRs`);
      return cached;
    }

    console.log(`  Fetching PRs since ${since.toISOString().slice(0, 10)}...`);
    const prs: RawPR[] = [];
    let page = 1;
    let done = false;

    while (!done) {
      const { data } = await this.octokit.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state: "all",
        per_page: 100,
        page,
        sort: "created",
        direction: "desc",
      });

      if (data.length === 0) break;

      for (const pr of data) {
        if (!pr.created_at || !pr.user) continue;
        if (new Date(pr.created_at) < since) {
          done = true;
          break;
        }
        prs.push({
          number: pr.number,
          title: pr.title,
          author: pr.user.login,
          created_at: pr.created_at,
          labels: pr.labels.map((l) => l.name ?? "").filter(Boolean),
        });
      }

      console.log(`    page ${page}: ${prs.length} PRs`);
      if (data.length < 100) break;
      page++;
    }

    writeCache(file, prs);
    console.log(`  Fetched ${prs.length} PRs total`);
    return prs;
  }

  async fetchReviews(prNumbers: number[]): Promise<RawReview[]> {
    const file = path.join(this.dir, "reviews.json");
    const cached = readCache<RawReview[]>(file);
    if (cached) {
      console.log(`  [cache] ${cached.length} reviews`);
      return cached;
    }

    console.log(`  Fetching reviews for ${prNumbers.length} PRs...`);
    const reviews: RawReview[] = [];

    for (let i = 0; i < prNumbers.length; i++) {
      if (i > 0 && i % 200 === 0) {
        console.log(`    ${i}/${prNumbers.length} PRs processed`);
      }

      try {
        const { data } = await this.octokit.pulls.listReviews({
          owner: this.owner,
          repo: this.repo,
          pull_number: prNumbers[i],
          per_page: 100,
        });

        for (const r of data) {
          if (!r.user?.login || !r.submitted_at) continue;
          reviews.push({
            pr_number: prNumbers[i],
            reviewer: r.user.login,
            submitted_at: r.submitted_at,
          });
        }
      } catch {
        // Skip — PR may have been deleted or inaccessible
      }

      // 75ms between requests keeps us well under GitHub's secondary rate limit
      await new Promise((r) => setTimeout(r, 75));
    }

    writeCache(file, reviews);
    console.log(`  Fetched ${reviews.length} reviews total`);
    return reviews;
  }

  async fetchContributors(since: Date): Promise<ContributorStat[]> {
    const file = path.join(this.dir, "contributors.json");
    const cached = readCache<ContributorStat[]>(file);
    if (cached) {
      console.log(`  [cache] ${cached.length} contributors`);
      return cached;
    }

    console.log(`  Fetching contributor stats...`);

    // GitHub computes this asynchronously and returns 202 until ready
    type StatsResponse = Awaited<ReturnType<typeof this.octokit.repos.getContributorsStats>>;
    let resp: StatsResponse | null = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      resp = await this.octokit.repos.getContributorsStats({
        owner: this.owner,
        repo: this.repo,
      });
      if (resp.status !== 202) break;
      console.log(`    stats still computing, retrying in 4s...`);
      await new Promise((r) => setTimeout(r, 4000));
    }

    const statsData = resp?.data ?? [];
    if (!Array.isArray(statsData)) {
      console.warn(`  Could not fetch contributor stats, skipping`);
      return [];
    }

    const sinceMs = since.getTime();
    const contributors: ContributorStat[] = [];

    for (const c of statsData) {
      if (!c.author?.login) continue;
      const windowCommits = (c.weeks ?? [])
        .filter((w) => (w.w ?? 0) * 1000 >= sinceMs)
        .reduce((sum, w) => sum + (w.c ?? 0), 0);

      if (windowCommits === 0) continue;
      contributors.push({
        login: c.author.login,
        name: null,
        avatar_url: c.author.avatar_url ?? "",
        total: windowCommits,
      });
    }

    writeCache(file, contributors);
    console.log(`  ${contributors.length} contributors with commits in window`);
    return contributors;
  }
}
