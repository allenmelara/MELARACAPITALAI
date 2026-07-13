import { describe, expect, it } from "vitest";
import { totalSpending, currentMonthKey, BUDGET_CATEGORIES } from "./budgetCalc";

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
