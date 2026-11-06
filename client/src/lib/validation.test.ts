import { describe, expect, it } from "vitest";
import { changedTargets, validateLotDraft } from "./lotValidation";
import { passwordProblem } from "./password";
import { summarize } from "./gradebook";
import type { LotDraft, Report } from "../api";

const good: LotDraft = {
  lotNumber: "LOT-12345", qcName: "Chem", department: "Chemistry", isActive: true, openDate: "2026-01-01", expirationDate: "2026-06-01",
  analytes: [{ analyteName: "Sodium", analyteAcronym: "Na", unitOfMeasure: "mmol/L", mean: 140, stdDevi: 1.5, minLevel: 137, maxLevel: 143 }],
};

describe("validateLotDraft", () => {
  it("accepts a complete lot", () => expect(validateLotDraft(good, true)).toEqual([]));
  it("reports each problem", () => {
    const bad: LotDraft = {
      ...good, lotNumber: "short", expirationDate: "2025-01-01",
      analytes: [{ ...good.analytes[0], stdDevi: 0 }, { ...good.analytes[0], maxLevel: 1, minLevel: 2 }],
    };
    const problems = validateLotDraft(bad, true);
    expect(problems.join(" ")).toMatch(/8 characters/);
    expect(problems.join(" ")).toMatch(/Expiration/);
    expect(problems.join(" ")).toMatch(/SD must be greater than 0/);
    expect(problems.join(" ")).toMatch(/max must be/);
    expect(problems.join(" ")).toMatch(/listed twice/);
  });
  it("does not re-check lot number length when editing", () => {
    expect(validateLotDraft({ ...good, lotNumber: "OLD" }, false)).toEqual([]);
  });
  it("requires numeric targets", () => {
    expect(validateLotDraft({ ...good, analytes: [{ ...good.analytes[0], mean: NaN }] }, true)[0]).toMatch(/must be numbers/);
  });
});

describe("passwordProblem", () => {
  it("mirrors the API policy", () => {
    expect(passwordProblem("short1A")).toMatch(/8/);
    expect(passwordProblem("alllowercase1")).toMatch(/uppercase/);
    expect(passwordProblem("Valid1234")).toBeNull();
  });
});

describe("gradebook summarize", () => {
  it("averages grades per student", () => {
    const r = (studentID: string, studentName: string, grade: number) => ({ studentID, studentName, grade, runDate: "2026-01-01", reviewedDate: "2026-01-02" }) as Report;
    expect(summarize([r("a", "Ann", 90), r("a", "Ann", 81), r("b", "Ben", 70)])).toEqual([
      { studentID: "a", name: "Ann", count: 2, average: 85.5, latest: "2026-01-02" },
      { studentID: "b", name: "Ben", count: 1, average: 70, latest: "2026-01-02" },
    ]);
  });
});

describe("changedTargets", () => {
  const saved = [{ analyteID: "na", analyteAcronym: "Na", mean: 140, stdDevi: 1.5 }];
  const withNa = (mean: number, stdDevi: number): LotDraft => ({ ...good, analytes: [{ ...good.analytes[0], analyteID: "na", mean, stdDevi }] });

  it("is empty when targets are unchanged or analytes are new", () => {
    expect(changedTargets(saved, withNa(140, 1.5))).toEqual([]);
    expect(changedTargets(saved, good)).toEqual([]); // no analyteID → a new analyte, nothing to re-score
  });

  it("lists each changed mean and SD", () => {
    expect(changedTargets(saved, withNa(141, 2))).toEqual([
      { acronym: "Na", field: "mean", from: 140, to: 141 },
      { acronym: "Na", field: "SD", from: 1.5, to: 2 },
    ]);
  });

  it("ignores a field that is mid-edit (blank)", () => {
    expect(changedTargets(saved, withNa(NaN, 1.5))).toEqual([]);
  });
});
