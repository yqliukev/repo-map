import { REPOS } from "../../scraper/src/config";
import { buildCollaborationEdges } from "./edges/build";
import { buildContributorGraph } from "./graph/build";
import { ensureActivity } from "./io/activity";
import {
  readCacheMeta,
  readComputeMeta,
  readContributors,
  writeComputeMeta,
  writeSkills,
  writeSubprojects,
} from "./io/cache";
import { publishGraphs } from "./io/publish";
import { buildComputeMeta, buildComputeMetaInputs } from "./meta/build";
import { canSkipCompute } from "./meta/skip";
import { repoToCacheDir } from "./paths";
import { buildProjectGraph } from "./project-graph/build";
import { buildSkills } from "./skills/build";
import { buildSubprojects } from "./subprojects/build";

function log(repo: string, msg: string) {
  console.log(`[${repo}] ${msg}`);
}

async function computeRepo(repo: string): Promise<void> {
  const cacheDir = repoToCacheDir(repo);
  const start = Date.now();

  log(repo, "Ensuring activity.json...");
  const activity = ensureActivity(cacheDir);

  const cacheMeta = readCacheMeta(cacheDir);
  const inputs = buildComputeMetaInputs(cacheMeta, activity);
  const existingMeta = readComputeMeta(cacheDir);

  if (canSkipCompute(existingMeta, inputs, cacheDir, repo)) {
    log(repo, "Cache and graphs up to date — skipping compute");
    return;
  }

  log(repo, "Reading contributors...");
  const contributors = readContributors(cacheDir);

  log(repo, "Building subprojects...");
  const subprojects = buildSubprojects(repo, activity, contributors);
  const subprojectsPath = writeSubprojects(cacheDir, subprojects);
  const subprojectCount = Object.keys(subprojects.subprojects).length;

  log(repo, "Building skills...");
  const skillsResult = buildSkills(cacheDir, activity, contributors, subprojects);
  const skillsPath = writeSkills(cacheDir, skillsResult.data);
  const skillCount = Object.keys(skillsResult.data.skills).length;
  const contributorSkillCount = Object.keys(skillsResult.byLogin).length;

  log(repo, "Building collaboration edges...");
  const links = buildCollaborationEdges(activity, contributors);

  log(repo, "Building contributor graph...");
  const contributorGraph = buildContributorGraph(
    repo,
    activity,
    contributors,
    subprojects,
    skillsResult,
    links
  );

  log(repo, "Building project graph...");
  const projectGraph = buildProjectGraph(repo, subprojects, skillsResult);

  log(repo, "Publishing graphs...");
  const published = publishGraphs(
    repo,
    contributorGraph,
    projectGraph,
    skillsResult.data
  );

  const graphsAt = contributorGraph.generated_at;
  const computeMeta = buildComputeMeta(
    inputs,
    subprojects,
    skillsResult.data,
    graphsAt
  );
  const computeMetaPath = writeComputeMeta(cacheDir, computeMeta);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  log(repo, `Done, Reporting:`);
  log(repo, `${subprojectCount} subprojects → ${subprojectsPath}`);
  log(repo, `${skillCount} skills (${contributorSkillCount} contributors) → ${skillsPath}`);
  log(repo, `${contributorGraph.nodes.length} nodes / ${contributorGraph.links.length} collaboration edges → ${published.graphPath}`);
  log(repo, `${projectGraph.nodes.length} project nodes / ${projectGraph.links.length} project links → ${published.projectGraphPath}`);
  log(repo, `compute_meta → ${computeMetaPath}`);
  log(repo, `(${elapsed}s)`);
}

async function main() {
  const args = process.argv.slice(2);
  const repoFlag = args.indexOf("--repo");
  const targets =
    repoFlag !== -1 && args[repoFlag + 1] ? [args[repoFlag + 1]] : REPOS;

  console.log(`Computing for ${targets.length} repo(s): ${targets.join(", ")}`);

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
