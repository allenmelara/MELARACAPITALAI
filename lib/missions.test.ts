import { describe, expect, it } from "vitest";
import { generateMissions } from "./missions";
import type { CategoryScore } from "./healthScoreCalc";

function category(overrides: Partial<CategoryScore> = {}): CategoryScore {
  return {
    key: "cashFlow",
    label: "Cash flow",
    score: 15,
    maxScore: 15,
    available: true,
    explanation: "explanation",
    howToImprove: "how to improve",
    ...overrides
  };
}

describe("generateMissions", () => {
  it("returns nothing when everything scores well and no anomalies exist", () => {
    const missions = generateMissions({
      categories: [category({ key: "cashFlow", score: 15, maxScore: 15 })],
      savingsStreak: { currentMonths: 3, longestMonths: 3 },
      spendingAnomalies: []
    });
    expect(missions).toEqual([]);
  });

  it("surfaces a mission for a category scoring under half its max", () => {
    const missions = generateMissions({
      categories: [category({ key: "debt", label: "Debt", score: 2, maxScore: 15 })],
      savingsStreak: { currentMonths: 0, longestMonths: 0 },
      spendingAnomalies: []
    });
    expect(missions).toHaveLength(1);
    expect(missions[0].id).toBe("improve-debt");
  });

  it("surfaces a setup nudge for an unavailable category", () => {
    const missions = generateMissions({
      categories: [category({ key: "diversification", available: false })],
      savingsStreak: { currentMonths: 0, longestMonths: 0 },
      spendingAnomalies: []
    });
    expect(missions[0].id).toBe("setup-diversification");
  });

  it("caps missions at 3 even with many gaps", () => {
    const categories = (["cashFlow", "emergencySavings", "debt", "savingsConsistency", "diversification"] as const).map(
      (key) => category({ key, available: false })
    );
    const missions = generateMissions({ categories, savingsStreak: { currentMonths: 0, longestMonths: 0 }, spendingAnomalies: [] });
    expect(missions).toHaveLength(3);
  });

  it("includes a budget challenge from the worst spending anomaly", () => {
    const missions = generateMissions({
      categories: [],
      savingsStreak: { currentMonths: 0, longestMonths: 0 },
      spendingAnomalies: [
        { category: "Entertainment", currentAmount: 400, averageAmount: 100, percentChange: 3 },
        { category: "Food", currentAmount: 550, averageAmount: 500, percentChange: 0.1 }
      ]
    });
    expect(missions).toHaveLength(1);
    expect(missions[0].id).toBe("budget-challenge-Entertainment");
  });
});
