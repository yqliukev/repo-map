import { join } from "path";

const REPO_ROOT = join(__dirname, "..", "..");

export function repoToCacheDir(repo: string): string {
  const slug = repo.replace("/", "_");
  return join(REPO_ROOT, "cache", slug);
}

export function repoToGraphDir(repo: string): string {
  const slug = repo.replace("/", "_");
  return join(REPO_ROOT, "frontend", "public", "graphs", slug);
}

export { REPO_ROOT };
