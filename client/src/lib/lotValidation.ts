import type { LotDraft } from "../api";

/** Client-side checks that mirror the API's validation, so most mistakes are caught before a round trip. */
export function validateLotDraft(d: LotDraft, isNew: boolean): string[] {
  const problems: string[] = [];
  if (isNew && d.lotNumber.trim().length < 8) problems.push("Lot number must be at least 8 characters.");
  if (!d.qcName.trim()) problems.push("QC material name is required.");
  if (!d.openDate || !d.expirationDate || d.expirationDate <= d.openDate) problems.push("Expiration date must be after the open date.");
  if (d.analytes.length === 0) problems.push("Add at least one analyte.");
  const names = new Set<string>();
  d.analytes.forEach((a, i) => {
    const label = a.analyteName.trim() || `Analyte ${i + 1}`;
    if (!a.analyteName.trim() || !a.analyteAcronym.trim() || !a.unitOfMeasure.trim()) problems.push(`${label}: name, acronym and unit are required.`);
    if (![a.mean, a.stdDevi, a.minLevel, a.maxLevel].every(Number.isFinite)) problems.push(`${label}: mean, SD, min and max must be numbers.`);
    else {
      if (a.stdDevi <= 0) problems.push(`${label}: SD must be greater than 0.`);
      if (a.maxLevel < a.minLevel) problems.push(`${label}: max must be ≥ min.`);
    }
    const key = a.analyteName.trim().toLowerCase();
    if (key && names.has(key)) problems.push(`${label} is listed twice.`);
    names.add(key);
  });
  return problems;
}

export interface TargetChange { acronym: string; field: "mean" | "SD"; from: number; to: number }

/**
 * Analytes whose target mean or SD differs from the saved lot. Westgard checks and Levey-Jennings limits are always
 * computed from the lot's current targets, so on a lot that already has runs these changes re-score its history.
 */
export function changedTargets(saved: { analyteID: string; analyteAcronym: string; mean: number; stdDevi: number }[], draft: LotDraft): TargetChange[] {
  const changes: TargetChange[] = [];
  for (const a of draft.analytes) {
    const before = saved.find((s) => s.analyteID === a.analyteID);
    if (!before) continue;
    if (Number.isFinite(a.mean) && a.mean !== before.mean) changes.push({ acronym: before.analyteAcronym, field: "mean", from: before.mean, to: a.mean });
    if (Number.isFinite(a.stdDevi) && a.stdDevi !== before.stdDevi) changes.push({ acronym: before.analyteAcronym, field: "SD", from: before.stdDevi, to: a.stdDevi });
  }
  return changes;
}
