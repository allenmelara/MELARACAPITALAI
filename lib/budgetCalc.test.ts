import { describe, expect, it } from "vitest";
import { totalSpending, currentMonthKey, BUDGET_CATEGORIES, detectSpendingAnomalies } from "./budgetCalc";

describe("totalSpending", () => {
  it("sums category amounts", () => {
    expect(
      totalSpending({
        categories: [
          { category: "Housing", amount: 1500 },
          { category: "Food", amount: 400 }
        ]
      })
    ).toBe(1900);
  });

  it("returns 0 for no categories", () => {
    expect(totalSpending({ categories: [] })).toBe(0);
  });
});

describe("currentMonthKey", () => {
  it("returns the first day of the given month as an ISO date", () => {
    expect(currentMonthKey(new Date(2026, 6, 15))).toBe("2026-07-01");
  });
});

describe("BUDGET_CATEGORIES", () => {
  it("is a non-empty fixed list", () => {
    expect(BUDGET_CATEGORIES.length).toBeGreaterThan(0);
  });
});

describe("detectSpendingAnomalies", () => {
  it("returns nothing with fewer than 2 months of history", () => {
    expect(detectSpendingAnomalies([])).toEqual([]);
    expect(detectSpendingAnomalies([{ categories: [{ category: "Food", amount: 400 }] }])).toEqual([]);
  });

  it("flags a category that spikes far above its trailing average", () => {
    const history = [
      { categories: [{ category: "Entertainment", amount: 100 }] },
      { categories: [{ category: "Entertainment", amount: 100 }] },
      { categories: [{ category: "Entertainment", amount: 100 }] },
      { categories: [{ category: "Entertainment", amount: 400 }] } // most recent month
    ];
    const anomalies = detectSpendingAnomalies(history);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].category).toBe("Entertainment");
    expect(anomalies[0].percentChange).toBeGreaterThan(0.25);
  });

  it("does not flag a category that stays within the threshold", () => {
    const history = [
      { categories: [{ category: "Food", amount: 400 }] },
      { categories: [{ category: "Food", amount: 420 }] },
      { categories: [{ category: "Food", amount: 410 }] }
    ];
    expect(detectSpendingAnomalies(history)).toEqual([]);
  });

  it("ignores a category with no prior history", () => {
    const history = [
      { categories: [{ category: "Food", amount: 400 }] },
      { categories: [{ category: "Housing", amount: 1500 }] } // new category, no prior data
    ];
    expect(detectSpendingAnomalies(history)).toEqual([]);
  });
});
