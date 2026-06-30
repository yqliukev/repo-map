import { LAMBDA } from "../config";

export function recencyFactor(
  at: string,
  computeAt: Date,
  lambda = LAMBDA
): number {
  const days = (computeAt.getTime() - new Date(at).getTime()) / 86_400_000;
  return Math.exp(-lambda * Math.max(0, days));
}
