import { describe, expect, it } from "vitest";
import { calculateWealthMetrics, type WealthInputs } from "./wealth";

const baseInputs: WealthInputs = {
  monthlyIncome: 8000,
  monthlyExpenses: 5200,
  currentAssets: 120000,
  currentLiabilities: 20000,
  currentRetirementSavings: 60000,
  monthlyRetirementContribution: 800,
  expectedAnnualReturn: 0.07,
  yearsToRetirement: 30,
  emergencyFundMonths: 6,
  withdrawalRate: 0.04
};

describe("calculateWealthMetrics", () => {
  it("computes monthly cash flow as income minus expenses", () => {
    const metrics = calculateWealthMetrics(baseInputs);
    expect(metrics.monthlyCashFlow).toBe(2800);
  });

  it("computes savings rate as cash flow over income", () => {
    const metrics = calculateWealthMetrics(baseInputs);
    expect(metrics.savingsRate).toBeCloseTo(2800 / 8000, 6);
  });

  it("computes the emergency fund target from expenses and target months", () => {
    const metrics = calculateWealthMetrics(baseInputs);
    expect(metrics.emergencyFundTarget).toBe(5200 * 6);
  });

  it("computes current net worth as assets minus liabilities", () => {
    const metrics = calculateWealthMetrics(baseInputs);
    expect(metrics.currentNetWorth).toBe(100000);
  });

  it("grows the retirement balance beyond simple contributions when return is positive", () => {
    const metrics = calculateWealthMetrics(baseInputs);
    const totalContributions =
      baseInputs.currentRetirementSavings + baseInputs.monthlyRetirementContribution * baseInputs.yearsToRetirement * 12;
    expect(metrics.retirementBalance).toBeGreaterThan(totalContributions);
  });

  it("handles zero years to retirement without compounding", () => {
    const metrics = calculateWealthMetrics({ ...baseInputs, yearsToRetirement: 0 });
    expect(metrics.retirementBalance).toBe(baseInputs.currentRetirementSavings);
  });

  it("derives sustainable retirement income from the withdrawal rate", () => {
    const metrics = calculateWealthMetrics(baseInputs);
    expect(metrics.sustainableAnnualRetirementIncome).toBeCloseTo(
      metrics.retirementBalance * baseInputs.withdrawalRate,
      6
    );
  });
});
