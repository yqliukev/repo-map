import { WINDOW_MONTHS } from "./config";

export function getWindowStart(months: number = WINDOW_MONTHS): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}
