import { join } from "path";

export function getRepoRoot(): string {
  return join(process.cwd(), "..");
}

export function getCacheDir(): string {
  return join(getRepoRoot(), "cache");
}

export function getGraphsDir(): string {
  return join(getRepoRoot(), "frontend", "public", "graphs");
}

export function repoToSlug(repo: string): string {
  return repo.replace("/", "_");
}

export function slugToRepo(slug: string): string {
  const idx = slug.indexOf("_");
  if (idx === -1) return slug;
  return `${slug.slice(0, idx)}/${slug.slice(idx + 1)}`;
}

export function cacheDirForSlug(slug: string): string {
  return join(getCacheDir(), slug);
}

export function graphDirForSlug(slug: string): string {
  return join(getGraphsDir(), slug);
}

const SLUG_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}
