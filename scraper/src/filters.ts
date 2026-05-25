import { KNOWN_BOTS, MIN_ACTIVITY } from "./config";

export function isBot(login: string): boolean {
  return KNOWN_BOTS.has(login) || KNOWN_BOTS.has(login.toLowerCase()) || login.endsWith("[bot]");
}

export function filterActiveContributors(
  activityCounts: Map<string, number>
): Set<string> {
  return new Set(
    [...activityCounts.entries()]
      .filter(([login, count]) => !isBot(login) && count >= MIN_ACTIVITY)
      .map(([login]) => login)
  );
}
