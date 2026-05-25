import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { GitHubClient } from "./github";
import { filterActiveContributors } from "./filters";
import { buildGraph } from "./graph";
import { REPOS, WINDOW_MONTHS } from "./config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, "../../.env") });

const OUT_DIR = path.join(__dirname, "../../frontend/public/graphs");

async function scrapeRepo(token: string, repoSlug: string): Promise<void> {
  const parts = repoSlug.split("/");
  if (parts.length !== 2) {
    console.error(`  Skipping "${repoSlug}" — expected "owner/repo" format`);
    return;
  }
  const [owner, repo] = parts;

  const refDate = new Date();
  const since = new Date();
  since.setMonth(since.getMonth() - WINDOW_MONTHS);

  const client = new GitHubClient(token, owner, repo);
  const prs = await client.fetchPRs(since);
  if (prs.length === 0) {
    console.log(`  No PRs found in window — skipping graph output`);
    return;
  }

  const [reviews, contributors] = await Promise.all([
    client.fetchReviews(prs.map((p) => p.number)),
    client.fetchContributors(since),
  ]);

  // Count total activity (authored PRs + reviews given) per person
  const activityCounts = new Map<string, number>();
  for (const pr of prs) {
    activityCounts.set(pr.author, (activityCounts.get(pr.author) ?? 0) + 1);
  }
  for (const r of reviews) {
    activityCounts.set(r.reviewer, (activityCounts.get(r.reviewer) ?? 0) + 1);
  }

  const active = filterActiveContributors(activityCounts);
  console.log(`  ${active.size} active contributors after filtering`);

  const graph = buildGraph(repoSlug, prs, reviews, contributors, active, refDate);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `${repoSlug.replace("/", "_")}.json`);
  fs.writeFileSync(outFile, JSON.stringify(graph, null, 2));

  console.log(`  ${graph.nodes.length} nodes, ${graph.links.length} edges`);
  console.log(`  Written → ${path.relative(process.cwd(), outFile)}`);
}

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("Error: GITHUB_TOKEN not set. Add it to .env in the repo root.");
    process.exit(1);
  }

  // Single repo passed as argument, or scrape all configured repos
  const targets = process.argv[2] ? [process.argv[2]] : REPOS;

  for (const repoSlug of targets) {
    console.log(`\n=== ${repoSlug} ===`);
    try {
      await scrapeRepo(token, repoSlug);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // 404 is expected if a repo doesn't exist — log clearly and continue
      if (msg.includes("404") || msg.includes("Not Found")) {
        console.error(`  Repo not found — skipping`);
      } else {
        console.error(`  Error: ${msg}`);
      }
    }
  }

  console.log("\nDone.");
}

main();
