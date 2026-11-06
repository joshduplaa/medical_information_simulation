import { describe, expect, it } from "vitest";
import { evaluateSeries, formatZ, singleValueRules, statusOf, zScore } from "./westgard";

const MEAN = 100;
const SD = 2;
/** Build values from z-scores so each test reads as the rule it checks. */
const fromZ = (...zs: number[]) => zs.map((z) => MEAN + z * SD);
const rulesAt = (zs: number[], i = zs.length - 1) => evaluateSeries(fromZ(...zs), MEAN, SD)[i].rules;

describe("zScore", () => {
  it("is (x - mean) / SD", () => {
    expect(zScore(104, 100, 2)).toBe(2);
    expect(zScore(97, 100, 2)).toBe(-1.5);
  });
  it("is NaN when SD is not positive", () => {
    expect(zScore(1, 1, 0)).toBeNaN();
  });
});

describe("single-value rules", () => {
  it("flags 1-2s beyond 2 SD and 1-3s beyond 3 SD", () => {
    expect(singleValueRules(1.99)).toEqual([]);
    expect(singleValueRules(2.01)).toEqual(["1-2s"]);
    expect(singleValueRules(-2.5)).toEqual(["1-2s"]);
    expect(singleValueRules(3.01)).toEqual(["1-3s"]);
    expect(singleValueRules(-3.2)).toEqual(["1-3s"]);
  });
  it("treats exactly 2 SD as in control", () => {
    expect(singleValueRules(2)).toEqual([]);
  });
});

describe("multirules across runs", () => {
  it("2-2s: two consecutive results beyond 2 SD on the same side", () => {
    expect(rulesAt([0.1, 2.2, 2.4])).toContain("2-2s");
    expect(rulesAt([0.1, -2.2, -2.4])).toContain("2-2s");
    expect(rulesAt([0.1, 2.2, -2.4])).not.toContain("2-2s");
  });

  it("R-4s: consecutive results straddling ±2 SD", () => {
    expect(rulesAt([2.1, -2.1])).toContain("R-4s");
    expect(rulesAt([1.9, -2.5])).not.toContain("R-4s");
  });

  it("4-1s: four consecutive results beyond 1 SD on one side", () => {
    expect(rulesAt([1.2, 1.5, 1.1, 1.3])).toContain("4-1s");
    expect(rulesAt([1.2, 1.5, 0.9, 1.3])).not.toContain("4-1s");
    expect(rulesAt([-1.2, -1.5, -1.1, -1.3])).toContain("4-1s");
  });

  it("10x: ten consecutive results on the same side of the mean", () => {
    const nine = Array(9).fill(0.3);
    expect(rulesAt(nine)).not.toContain("10x");
    expect(rulesAt([...nine, 0.1])).toContain("10x");
    expect(rulesAt([...nine, -0.1])).not.toContain("10x");
  });

  it("only uses earlier runs, never later ones", () => {
    const evaluated = evaluateSeries(fromZ(2.5, 2.5), MEAN, SD);
    expect(evaluated[0].rules).toEqual(["1-2s"]);
    expect(evaluated[1].rules).toEqual(["1-2s", "2-2s"]);
  });
});

describe("status", () => {
  it("is reject for any rejection rule, warning for 1-2s alone, ok otherwise", () => {
    expect(statusOf([])).toBe("ok");
    expect(statusOf(["1-2s"])).toBe("warning");
    expect(statusOf(["1-2s", "2-2s"])).toBe("reject");
    expect(statusOf(["10x"])).toBe("reject");
  });
  it("formats z-scores with sign", () => {
    expect(formatZ(1.234)).toBe("+1.23 SD");
    expect(formatZ(-0.5)).toBe("−0.50 SD");
    expect(formatZ(NaN)).toBe("—");
  });
});
