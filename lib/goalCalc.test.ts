import { describe, expect, it } from "vitest";
import { calculateGoalProjection } from "./goalCalc";
import type { FinancialGoal } from "./financialGoals";

function makeGoal(overrides: Partial<FinancialGoal> = {}): FinancialGoal {
  return {
    id: "1",
    name: "Test goal",
    category: "general",
    targetAmount: 10_000,
    currentAmount: 2000,
    targetDate: null,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("calculateGoalProjection", () => {
  it("returns an empty series when there's no target date", () => {
    const { series, requiredMonthlyContribution } = calculateGoalProjection(makeGoal({ targetDate: null }));
    expect(series).toEqual([]);
    expect(requiredMonthlyContribution).toBeNull();
  });

  it("projects a straight line from current to target amount", () => {
    const target = new Date();
    target.setMonth(target.getMonth() + 12);
    const goal = makeGoal({ currentAmount: 0, targetAmount: 12_000, targetDate: target.toISOString().slice(0, 10) });

    const { series, requiredMonthlyContribution } = calculateGoalProjection(goal);
    expect(requiredMonthlyContribution).toBeCloseTo(1000, 0);
    expect(series[0].amount).toBeCloseTo(0, 0);
    expect(series[series.length - 1].amount).toBeCloseTo(12_000, 0);
  });

  it("returns a zero required contribution once the goal is already met", () => {
    const target = new Date();
    target.setMonth(target.getMonth() + 6);
    const goal = makeGoal({ currentAmount: 5000, targetAmount: 5000, targetDate: target.toISOString().slice(0, 10) });

    const { requiredMonthlyContribution } = calculateGoalProjection(goal);
    expect(requiredMonthlyContribution).toBe(0);
  });
});
