import { isBot } from "../../../scraper/src/filters";
import type { ActivityData, ContributorStat, GraphLink } from "../../../scraper/src/types";
import {
  CO_PRESENCE_WEIGHT,
  MAX_PATH_FANOUT,
  MIN_ACTIVITY,
  MIN_EDGE_WEIGHT,
  PATH_OVERLAP_WEIGHT,
  REVIEW_WEIGHT,
} from "../config";
import { normalizePath } from "../subprojects/normalize";
import { recencyFactor } from "./recency";

interface PrBucket {
  author: string | null;
  authorAt: string | null;
  reviews: Array<{ login: string; at: string }>;
}

interface PathTouch {
  touches: number;
  latestAt: string;
}

function activeLogins(contributors: ContributorStat[]): Set<string> {
  return new Set(
    contributors
      .filter((c) => !isBot(c.login) && c.total >= MIN_ACTIVITY)
      .map((c) => c.login)
  );
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

function addWeight(acc: Map<string, number>, a: string, b: string, w: number): void {
  if (a === b || w <= 0) return;
  const key = pairKey(a, b);
  acc.set(key, (acc.get(key) ?? 0) + w);
}

function indexByPr(activity: ActivityData): Map<number, PrBucket> {
  const byPr = new Map<number, PrBucket>();

  for (const event of activity.events) {
    if (event.kind === "pr_author") {
      let bucket = byPr.get(event.pr);
      if (!bucket) {
        bucket = { author: null, authorAt: null, reviews: [] };
        byPr.set(event.pr, bucket);
      }
      bucket.author = event.login;
      bucket.authorAt = event.at;
    } else if (event.kind === "review") {
      let bucket = byPr.get(event.pr);
      if (!bucket) {
        bucket = { author: null, authorAt: null, reviews: [] };
        byPr.set(event.pr, bucket);
      }
      bucket.reviews.push({ login: event.login, at: event.at });
    }
  }

  return byPr;
}

function addSharedPrEdges(
  byPr: Map<number, PrBucket>,
  active: Set<string>,
  acc: Map<string, number>,
  computeAt: Date
): void {
  for (const bucket of byPr.values()) {
    const author = bucket.author;
    const activeReviews = bucket.reviews.filter((r) => active.has(r.login));

    if (author && active.has(author)) {
      for (const review of activeReviews) {
        const w = REVIEW_WEIGHT * recencyFactor(review.at, computeAt);
        addWeight(acc, author, review.login, w);
      }
    }

    const reviewers = [...new Set(activeReviews.map((r) => r.login))];
    if (reviewers.length < 2) continue;

    const refAt =
      bucket.authorAt ??
      activeReviews.reduce(
        (earliest, r) => (r.at < earliest ? r.at : earliest),
        activeReviews[0].at
      );
    const coPresence = CO_PRESENCE_WEIGHT * recencyFactor(refAt, computeAt);

    for (let i = 0; i < reviewers.length; i++) {
      for (let j = i + 1; j < reviewers.length; j++) {
        addWeight(acc, reviewers[i], reviewers[j], coPresence);
      }
    }
  }
}

function indexPathsByLogin(
  activity: ActivityData,
  active: Set<string>
): Map<string, Map<string, PathTouch>> {
  const paths = new Map<string, Map<string, PathTouch>>();

  for (const event of activity.events) {
    if (event.kind !== "pr_author") continue;
    if (!active.has(event.login)) continue;

    let byPath = paths.get(event.login);
    if (!byPath) {
      byPath = new Map();
      paths.set(event.login, byPath);
    }

    const seenInEvent = new Set<string>();
    for (const rawPath of event.paths) {
      const p = normalizePath(rawPath);
      if (!p || seenInEvent.has(p)) continue;
      seenInEvent.add(p);

      let touch = byPath.get(p);
      if (!touch) {
        touch = { touches: 0, latestAt: event.at };
        byPath.set(p, touch);
      }
      touch.touches += 1;
      if (event.at > touch.latestAt) {
        touch.latestAt = event.at;
      }
    }
  }

  return paths;
}

function addSharedPathEdges(
  pathsByLogin: Map<string, Map<string, PathTouch>>,
  active: Set<string>,
  acc: Map<string, number>,
  computeAt: Date
): void {
  const N = active.size;
  if (N < 2) return;

  const pathToLogins = new Map<string, Set<string>>();
  for (const [login, byPath] of pathsByLogin) {
    if (!active.has(login)) continue;
    for (const p of byPath.keys()) {
      let logins = pathToLogins.get(p);
      if (!logins) {
        logins = new Set();
        pathToLogins.set(p, logins);
      }
      logins.add(login);
    }
  }

  for (const [p, logins] of pathToLogins) {
    const fanout = logins.size;
    if (fanout < 2 || fanout > MAX_PATH_FANOUT) continue;

    const idf = Math.log(N / fanout);
    const loginList = [...logins];

    for (let i = 0; i < loginList.length; i++) {
      for (let j = i + 1; j < loginList.length; j++) {
        const A = loginList[i];
        const B = loginList[j];
        const touchA = pathsByLogin.get(A)?.get(p);
        const touchB = pathsByLogin.get(B)?.get(p);
        if (!touchA || !touchB) continue;

        const overlap = Math.min(touchA.touches, touchB.touches);
        const t = touchA.latestAt > touchB.latestAt ? touchA.latestAt : touchB.latestAt;
        const w = PATH_OVERLAP_WEIGHT * overlap * idf * recencyFactor(t, computeAt);
        addWeight(acc, A, B, w);
      }
    }
  }
}

function emitLinks(acc: Map<string, number>): GraphLink[] {
  const links: GraphLink[] = [];

  for (const [key, weight] of acc) {
    if (weight < MIN_EDGE_WEIGHT) continue;
    const [source, target] = key.split("\0");
    links.push({ source, target, weight });
  }

  links.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    return a.target.localeCompare(b.target);
  });

  return links;
}

export function buildCollaborationEdges(
  activity: ActivityData,
  contributors: ContributorStat[],
  computeAt: Date = new Date()
): GraphLink[] {
  const active = activeLogins(contributors);
  const acc = new Map<string, number>();

  const byPr = indexByPr(activity);
  addSharedPrEdges(byPr, active, acc, computeAt);

  const pathsByLogin = indexPathsByLogin(activity, active);
  addSharedPathEdges(pathsByLogin, active, acc, computeAt);

  return emitLinks(acc);
}
