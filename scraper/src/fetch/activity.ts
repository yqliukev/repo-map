import type { ActivityData, ActivityEvent, RawPR, RawReview } from "../types";

export function buildActivity(prs: RawPR[], reviews: RawReview[]): ActivityData {
  const prAuthors = new Map(prs.map((pr) => [pr.number, pr.author]));
  const events: ActivityEvent[] = [];

  for (const pr of prs) {
    events.push({
      kind: "pr_author",
      login: pr.author,
      pr: pr.number,
      at: pr.created_at,
      paths: pr.files.map((f) => f.path),
      title: pr.title,
    });
  }

  for (const review of reviews) {
    events.push({
      kind: "review",
      login: review.reviewer,
      pr: review.pr_number,
      author: prAuthors.get(review.pr_number) ?? "",
      at: review.submitted_at,
    });
  }

  events.sort((a, b) => a.at.localeCompare(b.at));

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    events,
  };
}
