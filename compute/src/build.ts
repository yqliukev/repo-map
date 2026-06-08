import { REPOS } from "../../scraper/src/config";
import { ensureActivity } from "./io/activity";
import { readContributors, writeSubprojects } from "./io/cache";
import { repoToCacheDir } from "./paths";
import { buildSubprojects } from "./subprojects/build";

function log(repo: string, msg: string) {
  console.log(`[${repo}] ${msg}`);
}

async function computeRepo(repo: string): Promise<void> {
  const cacheDir = repoToCacheDir(repo);
  const start = Date.now();

  log(repo, "Ensuring activity.json...");
  const activity = ensureActivity(cacheDir);

  log(repo, "Reading contributors...");
  const contributors = readContributors(cacheDir);

  log(repo, "Building subprojects...");
  const subprojects = buildSubprojects(repo, activity, contributors);

  const outPath = writeSubprojects(cacheDir, subprojects);
  const count = Object.keys(subprojects.subprojects).length;
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  log(repo, `Done — ${count} subprojects → ${outPath} (${elapsed}s)`);
}

async function main() {
  const args = process.argv.slice(2);
  const repoFlag = args.indexOf("--repo");
  const targets =
    repoFlag !== -1 && args[repoFlag + 1] ? [args[repoFlag + 1]] : REPOS;

  console.log(`Computing subprojects for ${targets.length} repo(s): ${targets.join(", ")}`);

  for (const repo of targets) {
    try {
      await computeRepo(repo);
    } catch (err) {
      console.error(`[${repo}] Failed:`, err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  }
}

main();
