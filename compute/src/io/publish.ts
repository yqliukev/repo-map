import { mkdirSync } from "fs";
import { join } from "path";
import type { GraphData } from "../../../scraper/src/types";
import type { ProjectGraphData, SkillsData } from "../types";
import { repoToGraphDir } from "../paths";
import { writeJson } from "./json";

export interface PublishedGraphs {
  graphPath: string;
  projectGraphPath: string;
  skillsPath: string;
}

export function publishGraphs(
  repo: string,
  contributorGraph: GraphData,
  projectGraph: ProjectGraphData,
  skills: SkillsData
): PublishedGraphs {
  const dir = repoToGraphDir(repo);
  mkdirSync(dir, { recursive: true });

  const graphPath = join(dir, "graph.json");
  const projectGraphPath = join(dir, "project_graph.json");
  const skillsPath = join(dir, "skills.json");

  writeJson(graphPath, contributorGraph);
  writeJson(projectGraphPath, projectGraph);
  writeJson(skillsPath, skills);

  return { graphPath, projectGraphPath, skillsPath };
}
