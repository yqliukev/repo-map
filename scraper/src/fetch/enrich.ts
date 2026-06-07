import type { Octokit } from "@octokit/rest";
import { writeEnrichCache } from "../cache";
import type { RawPR, RawReview } from "../types";
import { buildActivity } from "./activity";
import { fetchLanguages } from "./languages";
import { fetchManifests } from "./manifests";

interface EnrichRepoOptions {
  octokit: Octokit;
  owner: string;
  repo: string;
  prs: RawPR[];
  reviews: RawReview[];
  log: (msg: string) => void;
}

export async function enrichRepo(options: EnrichRepoOptions): Promise<void> {
  const { octokit, owner, repo, prs, reviews, log } = options;

  log("Enriching — languages, manifests, activity...");

  const [languages, manifests] = await Promise.all([
    fetchLanguages(octokit, owner, repo),
    fetchManifests({ octokit, owner, repo, prs, log }),
  ]);

  const activity = buildActivity(prs, reviews);

  writeEnrichCache(`${owner}/${repo}`, { languages, manifests, activity });

  log(
    `Enrichment done — ${Object.keys(languages).length} languages, ${Object.keys(manifests).length} manifests, ${activity.events.length} events`
  );
}
