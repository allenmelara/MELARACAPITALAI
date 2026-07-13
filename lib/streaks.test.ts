import { describe, expect, it } from "vitest";
import { calculateSavingsStreak, calculateInvestmentConsistencyStreak } from "./streaks";

function budget(income: number, categories: Array<{ category: string; amount: number }>) {
  return { income, categories };
}

describe("calculateSavingsStreak", () => {
  it("returns zeros for no history", () => {
    expect(calculateSavingsStreak([])).toEqual({ currentMonths: 0, longestMonths: 0 });
  });

  it("counts a current streak from the most recent month backward", () => {
    const history = [
      budget(4000, [{ category: "Food", amount: 4500 }]), // negative
      budget(4000, [{ category: "Food", amount: 2000 }]), // positive
      budget(4000, [{ category: "Food", amount: 2000 }]) // positive
    ];
    expect(calculateSavingsStreak(history)).toEqual({ currentMonths: 2, longestMonths: 2 });
  });

  it("tracks the longest streak separately from the current one", () => {
    const history = [
      budget(4000, [{ category: "Food", amount: 2000 }]), // positive
      budget(4000, [{ category: "Food", amount: 2000 }]), // positive
      budget(4000, [{ category: "Food", amount: 2000 }]), // positive
      budget(4000, [{ category: "Food", amount: 4500 }]), // negative — breaks streak
      budget(4000, [{ category: "Food", amount: 2000 }]) // positive, current streak = 1
    ];
    expect(calculateSavingsStreak(history)).toEqual({ currentMonths: 1, longestMonths: 3 });
  });
});

describe("calculateInvestmentConsistencyStreak", () => {
  it("only counts months with a positive Savings/Investments category amount", () => {
    const history = [
      budget(4000, [{ category: "Savings/Investments", amount: 0 }]),
      budget(4000, [{ category: "Savings/Investments", amount: 200 }]),
      budget(4000, [{ category: "Savings/Investments", amount: 300 }])
    ];
    expect(calculateInvestmentConsistencyStreak(history)).toEqual({ currentMonths: 2, longestMonths: 2 });
  });

  it("treats a missing category as non-qualifying", () => {
    const history = [budget(4000, [{ category: "Food", amount: 500 }])];
    expect(calculateInvestmentConsistencyStreak(history)).toEqual({ currentMonths: 0, longestMonths: 0 });
  });
});
