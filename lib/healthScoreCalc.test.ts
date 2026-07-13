import { describe, expect, it } from "vitest";
import { calculateHealthScore } from "./healthScoreCalc";

const EMPTY_INPUTS = {
  latestBudget: null,
  budgetHistory: [],
  emergencyFundProgress: null,
  retirementProgress: null,
  debts: [],
  monthlyIncome: null,
  investmentAllocation: [],
  insuranceFlags: [null, null, null, null]
};

describe("calculateHealthScore", () => {
  it("gives full marks for debt when there are no debts, even with no other data", () => {
    // An empty debts array is itself a valid, computable state ("no debts"
    // earns full marks) — it's the one category that's never unavailable,
    // so a fully-empty input still yields a (favorable) overall score.
    const result = calculateHealthScore(EMPTY_INPUTS);
    const debtCategory = result.categories.find((c) => c.key === "debt")!;
    expect(debtCategory.available).toBe(true);
    expect(debtCategory.score).toBe(debtCategory.maxScore);
    expect(result.categories.filter((c) => c.available).map((c) => c.key)).toEqual(["debt"]);
    expect(result.overallScore).toBe(100);
  });

  it("returns a null overall score when even debt has no computable state", () => {
    // Not realistic in practice (debts defaults to []), but confirms the
    // "no available categories" path directly.
    const result = calculateHealthScore({
      ...EMPTY_INPUTS,
      debts: [{ balance: 500, minimumPayment: 50 }] // has a debt, but no income to compute DTI against
    });
    expect(result.categories.every((c) => !c.available)).toBe(true);
    expect(result.overallScore).toBeNull();
  });

  it("scores an overall value only from available categories, not penalized by unavailable ones", () => {
    const result = calculateHealthScore({
      ...EMPTY_INPUTS,
      emergencyFundProgress: 1, // fully funded
      retirementProgress: 1 // fully on track
    });
    // Only emergencySavings (15), retirementProgress (15), and debt (15, no debts) are available.
    const available = result.categories.filter((c) => c.available);
    expect(available.map((c) => c.key).sort()).toEqual(["debt", "emergencySavings", "retirementProgress"]);
    expect(result.overallScore).toBe(100);
  });

  it("computes cash flow from a logged month's income and spending", () => {
    const result = calculateHealthScore({
      ...EMPTY_INPUTS,
      latestBudget: { income: 5000, categories: [{ category: "Food", amount: 4000 }] } // 20% savings rate
    });
    const cashFlow = result.categories.find((c) => c.key === "cashFlow")!;
    expect(cashFlow.available).toBe(true);
    expect(cashFlow.score).toBeCloseTo(cashFlow.maxScore, 1);
  });

  it("penalizes a high debt-to-income ratio", () => {
    const result = calculateHealthScore({
      ...EMPTY_INPUTS,
      monthlyIncome: 4000,
      debts: [{ balance: 10_000, minimumPayment: 1800 }] // 45% DTI
    });
    const debtCategory = result.categories.find((c) => c.key === "debt")!;
    expect(debtCategory.available).toBe(true);
    expect(debtCategory.score).toBe(0);
  });

  it("scores insurance readiness from only the answered flags", () => {
    const result = calculateHealthScore({
      ...EMPTY_INPUTS,
      insuranceFlags: [true, true, null, null]
    });
    const insurance = result.categories.find((c) => c.key === "insuranceReadiness")!;
    expect(insurance.available).toBe(true);
    expect(insurance.score).toBe(insurance.maxScore);
  });

  it("penalizes diversification for a concentrated portfolio", () => {
    const result = calculateHealthScore({
      ...EMPTY_INPUTS,
      investmentAllocation: [{ percent: 100 }]
    });
    const diversification = result.categories.find((c) => c.key === "diversification")!;
    expect(diversification.available).toBe(true);
    expect(diversification.score).toBe(0);
  });
});
