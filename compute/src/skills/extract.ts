import type { ActivityData } from "../../../scraper/src/types";
import { signalsFromPaths } from "./extensions";
import {
  manifestsForPaths,
  signalsFromDeps,
  type ManifestIndexEntry,
} from "./manifests";
import { signalsFromPathSegments } from "./paths";
import type { SignalHit } from "./types";

export function extractSignalHits(
  activity: ActivityData,
  manifestIndex: ManifestIndexEntry[],
  activeLogins: Set<string>,
  excludeSegments: Set<string>
): SignalHit[] {
  const hits: SignalHit[] = [];

  for (const event of activity.events) {
    if (event.kind !== "pr_author") continue;
    if (!activeLogins.has(event.login)) continue;

    const seenIds = new Set<string>();

    const addSignals = (
      signals: Array<{ id: string; label: string; source: SignalHit["signal"]["source"] }>
    ) => {
      for (const signal of signals) {
        if (seenIds.has(signal.id)) continue;
        seenIds.add(signal.id);
        hits.push({
          login: event.login,
          signal,
          weight: 1,
          at: event.at,
        });
      }
    };

    addSignals(signalsFromPaths(event.paths));
    addSignals(signalsFromPathSegments(event.paths, excludeSegments));

    for (const manifest of manifestsForPaths(event.paths, manifestIndex)) {
      addSignals(signalsFromDeps(manifest.deps));
    }
  }

  return hits;
}
