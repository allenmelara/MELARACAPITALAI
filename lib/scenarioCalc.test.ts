import { describe, expect, it } from "vitest";
import { simulateSavingsGrowth, compareDebtPayoffVsInvesting } from "./scenarioCalc";
import type { Debt } from "./debts";

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: "1",
    name: "Test debt",
    debtType: "credit_card",
    balance: 1000,
    interestRate: 12,
    minimumPayment: 100,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("simulateSavingsGrowth", () => {
  it("returns zero for zero months", () => {
    const result = simulateSavingsGrowth({ extraMonthlyAmount: 200, months: 0 });
    expect(result.projectedValue).toBe(0);
    expect(result.totalContributed).toBe(0);
  });

  it("grows more than the raw contributions when return is positive", () => {
    const result = simulateSavingsGrowth({ extraMonthlyAmount: 200, months: 60, annualReturn: 0.07 });
    expect(result.totalContributed).toBe(12_000);
    expect(result.projectedValue).toBeGreaterThan(result.totalContributed);
    expect(result.projectedGrowth).toBeGreaterThan(0);
  });

  it("matches raw contributions with zero return", () => {
    const result = simulateSavingsGrowth({ extraMonthlyAmount: 100, months: 12, annualReturn: 0 });
    expect(result.projectedValue).toBeCloseTo(1200, 2);
    expect(result.projectedGrowth).toBeCloseTo(0, 2);
  });
});

describe("compareDebtPayoffVsInvesting", () => {
  it("shows the accelerated payoff is faster and saves interest", () => {
    const debts = [makeDebt()];
    const result = compareDebtPayoffVsInvesting({ debts, extraMonthlyAmount: 200 });
    expect(result.debtPayoff.monthsSaved).toBeGreaterThan(0);
    expect(result.debtPayoff.interestSaved).toBeGreaterThan(0);
  });

  it("still returns an investing projection with no debts", () => {
    const result = compareDebtPayoffVsInvesting({ debts: [], extraMonthlyAmount: 200, horizonMonths: 12 });
    expect(result.debtPayoff.baselineMonthsToPayoff).toBe(0);
    expect(result.investing.projectedValue).toBeGreaterThan(0);
  });
});
