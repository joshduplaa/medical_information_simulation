/**
 * Quality-control statistics for one control material + analyte.
 *
 * Definitions (standard laboratory QC, as taught in clinical lab science programs):
 *   z = (x − mean) / SD, where mean and SD are the lot's established target values.
 *   Levey-Jennings chart: results in run order plotted against mean, ±1, ±2 and ±3 SD lines.
 *
 * Westgard multirules evaluated here, each looking at the current run and the runs before it:
 *   1-2s  warning   one result beyond ±2 SD
 *   1-3s  reject    one result beyond ±3 SD                                  (random error)
 *   2-2s  reject    two consecutive results beyond 2 SD on the same side     (systematic error)
 *   R-4s  reject    two consecutive results > 4 SD apart, one above +2 SD and one below −2 SD (random error)
 *   4-1s  reject    four consecutive results beyond 1 SD on the same side    (systematic error)
 *   10x   reject    ten consecutive results on the same side of the mean     (systematic error)
 *
 * Simplification (documented in docs/DECISIONS.md): R-4s is classically a within-run rule across two control
 * levels. MIS records one level per run, so it is applied across consecutive runs of the same control.
 */

export type RuleId = "1-2s" | "1-3s" | "2-2s" | "R-4s" | "4-1s" | "10x";
export type QcStatus = "ok" | "warning" | "reject";

export const RULES: Record<RuleId, { severity: "warning" | "reject"; description: string }> = {
  "1-2s": { severity: "warning", description: "One result beyond ±2 SD (warning — inspect the other rules)." },
  "1-3s": { severity: "reject", description: "One result beyond ±3 SD." },
  "2-2s": { severity: "reject", description: "Two consecutive results beyond 2 SD on the same side of the mean." },
  "R-4s": { severity: "reject", description: "Two consecutive results more than 4 SD apart (one above +2 SD, one below −2 SD)." },
  "4-1s": { severity: "reject", description: "Four consecutive results beyond 1 SD on the same side of the mean." },
  "10x": { severity: "reject", description: "Ten consecutive results on the same side of the mean." },
};

export function zScore(value: number, mean: number, sd: number): number {
  if (!(sd > 0)) return NaN;
  return (value - mean) / sd;
}

/** Rules violated by a single value on its own (only 1-2s and 1-3s can be judged without history). */
export function singleValueRules(z: number): RuleId[] {
  if (!Number.isFinite(z)) return [];
  if (Math.abs(z) > 3) return ["1-3s"];
  if (Math.abs(z) > 2) return ["1-2s"];
  return [];
}

export interface EvaluatedPoint {
  value: number;
  z: number;
  rules: RuleId[];
  status: QcStatus;
}

function lastN(zs: number[], end: number, n: number): number[] | null {
  return end + 1 >= n ? zs.slice(end + 1 - n, end + 1) : null;
}

const sameSide = (zs: number[], predicate: (z: number) => boolean) => zs.every(predicate);

/** Evaluates every point in run order, using only that point and the ones before it (as a tech would at the bench). */
export function evaluateSeries(values: number[], mean: number, sd: number): EvaluatedPoint[] {
  const zs = values.map((v) => zScore(v, mean, sd));

  return values.map((value, i) => {
    const z = zs[i];
    const rules: RuleId[] = [...singleValueRules(z)];

    const pair = lastN(zs, i, 2);
    if (pair) {
      if (sameSide(pair, (v) => v > 2) || sameSide(pair, (v) => v < -2)) rules.push("2-2s");
      const [a, b] = pair;
      if (Math.max(a, b) > 2 && Math.min(a, b) < -2) rules.push("R-4s");
    }
    const four = lastN(zs, i, 4);
    if (four && (sameSide(four, (v) => v > 1) || sameSide(four, (v) => v < -1))) rules.push("4-1s");
    const ten = lastN(zs, i, 10);
    if (ten && (sameSide(ten, (v) => v > 0) || sameSide(ten, (v) => v < 0))) rules.push("10x");

    return { value, z, rules, status: statusOf(rules) };
  });
}

export function statusOf(rules: RuleId[]): QcStatus {
  if (rules.some((r) => RULES[r].severity === "reject")) return "reject";
  if (rules.length > 0) return "warning";
  return "ok";
}

/** Formats a z-score for display, e.g. "+1.23 SD". */
export function formatZ(z: number): string {
  if (!Number.isFinite(z)) return "—";
  return `${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(2)} SD`;
}

/** The values recorded on this lot before the given run, in run order (the context the multirules look back over). */
export function priorValues(points: { reportID: string; runDate: string; value: number }[], reportId: string, runDate: string): number[] {
  const idx = points.findIndex((p) => p.reportID === reportId);
  if (idx >= 0) return points.slice(0, idx).map((p) => p.value);
  const cutoff = Date.parse(runDate);
  return points.filter((p) => Date.parse(p.runDate) < cutoff).map((p) => p.value);
}

/** Evaluates one result against the full multirule set, given the earlier results on the same lot and analyte. */
export function evaluateInContext(prior: number[], value: number, mean: number, sd: number): EvaluatedPoint {
  return evaluateSeries([...prior, value], mean, sd)[prior.length];
}
