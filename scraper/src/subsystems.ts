import { GENERIC_LABELS } from "./config";

// Strip common label prefixes like "area/networking" → "networking"
const LABEL_PREFIX_RE = /^(area|component|module|team|subsystem|scope|pkg|package|kind|type)[:/\s]+/i;

// Conventional commit types and other generic title prefixes that are not subsystems
const GENERIC_TITLE_PREFIXES = new Set([
  "fix", "feat", "feature", "chore", "docs", "doc", "test", "tests",
  "refactor", "style", "perf", "ci", "build", "revert", "improve",
  "cleanup", "clean", "update", "remove", "add", "wip", "misc",
  "hotfix", "patch", "release", "bump",
]);

export function detectSubsystem(title: string, labels: string[]): string {
  // 1. Labels — only use labels that have a recognized subsystem prefix stripped
  //    (e.g. "area/networking" → "networking"). Plain labels without a prefix
  //    are usually administrative and not useful as subsystem names.
  for (const label of labels) {
    if (!LABEL_PREFIX_RE.test(label)) continue;

    // Skip state: prefixed labels (e.g. "state:needs doc pr")
    if (/^state:/i.test(label)) continue;

    const clean = label
      .replace(LABEL_PREFIX_RE, "")
      .replace(/[-_]/g, " ")
      .trim()
      .toLowerCase();

    if (
      clean.length >= 2 &&
      clean.length <= 30 &&
      !GENERIC_LABELS.has(clean)
    ) {
      return clean;
    }
  }

  // 2. "subsystem: description" prefix — common in Go, Kubernetes, Linux, etc.
  //    Skip conventional commit types (fix:, feat:, chore:, etc.)
  const colonMatch = title.match(/^([a-zA-Z][a-zA-Z0-9/_-]{1,30}):\s/);
  if (colonMatch) {
    const prefix = colonMatch[1].split("/")[0].toLowerCase();
    if (!GENERIC_TITLE_PREFIXES.has(prefix) && !GENERIC_LABELS.has(prefix)) {
      return prefix;
    }
  }

  return "general";
}
