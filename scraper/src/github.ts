import { Octokit } from "@octokit/rest";
import * as dotenv from "dotenv";
import { join } from "path";
import { REPO_ROOT } from "./paths";

dotenv.config({ path: join(REPO_ROOT, ".env") });

export function createOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN is not set. Copy .env.example to .env and add your token."
    );
  }
  return new Octokit({ auth: token });
}
