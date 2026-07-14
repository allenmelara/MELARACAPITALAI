import { describe, expect, it } from "vitest";
import { calculateGoalProjection, computeLinkedGoalUpdates } from "./goalCalc";
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

describe("computeLinkedGoalUpdates", () => {
  it("syncs an emergency_fund goal to the cash-account figure", () => {
    const goal = makeGoal({ id: "ef", category: "emergency_fund", currentAmount: 1000 });
    const updates = computeLinkedGoalUpdates([goal], { emergencyFundCash: 4500, investmentsTotal: 0 });
    expect(updates).toEqual([{ id: "ef", target: 4500 }]);
  });

  it("syncs a retirement goal to the investments total", () => {
    const goal = makeGoal({ id: "ret", category: "retirement", currentAmount: 10_000 });
    const updates = computeLinkedGoalUpdates([goal], { emergencyFundCash: 0, investmentsTotal: 82_000 });
    expect(updates).toEqual([{ id: "ret", target: 82_000 }]);
  });

  it("leaves unlinkable categories untouched", () => {
    const goal = makeGoal({ id: "home", category: "home", currentAmount: 1000 });
    const updates = computeLinkedGoalUpdates([goal], { emergencyFundCash: 4500, investmentsTotal: 82_000 });
    expect(updates).toEqual([]);
  });

  it("skips a goal already within epsilon of its target to avoid pointless writes", () => {
    const goal = makeGoal({ id: "ef", category: "emergency_fund", currentAmount: 4500.001 });
    const updates = computeLinkedGoalUpdates([goal], { emergencyFundCash: 4500, investmentsTotal: 0 });
    expect(updates).toEqual([]);
  });

  it("updates multiple goals sharing the same category to the same figure", () => {
    const goals = [
      makeGoal({ id: "ef1", category: "emergency_fund", currentAmount: 0, targetAmount: 3000 }),
      makeGoal({ id: "ef2", category: "emergency_fund", currentAmount: 0, targetAmount: 6000 })
    ];
    const updates = computeLinkedGoalUpdates(goals, { emergencyFundCash: 4500, investmentsTotal: 0 });
    expect(updates).toEqual([
      { id: "ef1", target: 4500 },
      { id: "ef2", target: 4500 }
    ]);
  });
});
