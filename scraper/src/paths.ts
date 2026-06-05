import { join } from "path";

// Repo root is one level above scraper/
const REPO_ROOT = join(__dirname, "..", "..");

export function repoToCacheDir(repo: string): string {
  // "facebook/react" → "<repoRoot>/cache/facebook_react"
  const slug = repo.replace("/", "_");
  return join(REPO_ROOT, "cache", slug);
}

export { REPO_ROOT };
