import type { Report } from "../api";

/** First in, first out: the run that has waited longest is reviewed first. */
export const oldestSubmittedFirst = (runs: Report[]) =>
  [...runs].sort((a, b) => Date.parse(a.submittedDate ?? a.runDate) - Date.parse(b.submittedDate ?? b.runDate));
