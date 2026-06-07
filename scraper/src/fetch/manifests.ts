import type { Octokit } from "@octokit/rest";
import type { ManifestEntry, RawPR } from "../types";

const ROOT_MANIFESTS = [
  "package.json",
  "go.mod",
  "Cargo.toml",
  "requirements.txt",
  "pyproject.toml",
] as const;

const MANIFEST_BASENAMES = new Set<string>(ROOT_MANIFESTS);

function detectManifestPaths(prs: RawPR[]): string[] {
  const paths = new Set<string>(ROOT_MANIFESTS);

  for (const pr of prs) {
    for (const file of pr.files) {
      const basename = file.path.split("/").pop();
      if (basename && MANIFEST_BASENAMES.has(basename)) {
        paths.add(file.path);
      }
    }
  }

  return [...paths].sort();
}

function parsePackageJson(content: string): Record<string, string> {
  const pkg = JSON.parse(content) as Record<string, unknown>;
  const deps: Record<string, string> = {};

  for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
    const section = pkg[key];
    if (section && typeof section === "object") {
      for (const [name, version] of Object.entries(section as Record<string, unknown>)) {
        if (typeof version === "string") {
          deps[name] = version;
        }
      }
    }
  }

  return deps;
}

function parseGoMod(content: string): Record<string, string> {
  const deps: Record<string, string> = {};
  const requireBlock = content.match(/require\s*\(([\s\S]*?)\)/);
  const lines = requireBlock
    ? requireBlock[1].split("\n")
    : content.split("\n").filter((line) => line.trim().startsWith("require "));

  for (const line of lines) {
    const match = line.trim().match(/^([^\s]+)\s+([^\s]+)/);
    if (match) {
      deps[match[1]] = match[2];
    }
  }

  return deps;
}

function parseCargoToml(content: string): Record<string, string> {
  const deps: Record<string, string> = {};
  const sections = ["dependencies", "dev-dependencies"];

  for (const section of sections) {
    const match = content.match(new RegExp(`\\[${section}\\]([\\s\\S]*?)(?=\\n\\[|$)`));
    if (!match) continue;

    for (const line of match[1].split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[")) continue;

      const inline = trimmed.match(/^([A-Za-z0-9_-]+)\s*=\s*"([^"]+)"/);
      if (inline) {
        deps[inline[1]] = inline[2];
        continue;
      }

      const table = trimmed.match(/^([A-Za-z0-9_-]+)\s*=\s*\{/);
      if (table) {
        deps[table[1]] = "*";
      }
    }
  }

  return deps;
}

function parseDeps(path: string, content: string): Record<string, string> {
  const basename = path.split("/").pop() ?? path;

  if (basename === "package.json") {
    return parsePackageJson(content);
  }
  if (basename === "go.mod") {
    return parseGoMod(content);
  }
  if (basename === "Cargo.toml") {
    return parseCargoToml(content);
  }

  return {};
}

export function manifestPathKey(path: string): string {
  return path.replace(/\//g, "_");
}

interface FetchManifestsOptions {
  octokit: Octokit;
  owner: string;
  repo: string;
  prs: RawPR[];
  log: (msg: string) => void;
}

export async function fetchManifests(
  options: FetchManifestsOptions
): Promise<Record<string, ManifestEntry>> {
  const { octokit, owner, repo, prs, log } = options;
  const paths = detectManifestPaths(prs);
  const manifests: Record<string, ManifestEntry> = {};

  log(`Fetching ${paths.length} manifest file(s)...`);

  for (const path of paths) {
    try {
      const { data } = await octokit.rest.repos.getContent({ owner, repo, path });

      if (Array.isArray(data) || data.type !== "file" || !("content" in data) || !data.content) {
        continue;
      }

      const content = Buffer.from(data.content, "base64").toString("utf8");
      const deps = parseDeps(path, content);

      manifests[manifestPathKey(path)] = {
        source_path: path,
        fetched_at: new Date().toISOString(),
        deps,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`  Skipped manifest ${path}: ${message}`);
    }
  }

  return manifests;
}
