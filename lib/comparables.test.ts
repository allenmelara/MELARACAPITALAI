import { describe, expect, it } from "vitest";
import { calculateComparableMetrics, averageEvToEbitda } from "./comparables";

describe("calculateComparableMetrics", () => {
  it("computes EV/EBITDA, P/E, and EBITDA margin from full inputs", () => {
    const result = calculateComparableMetrics({
      currentPrice: 100,
      shares: 1_000_000,
      debt: 5_000_000,
      cash: 2_000_000,
      ebitda: 20_000_000,
      netIncome: 12_000_000,
      revenue: 80_000_000
    });

    const expectedEquityValue = 100 * 1_000_000;
    const expectedEnterpriseValue = expectedEquityValue + 5_000_000 - 2_000_000;

    expect(result.evToEbitda).toBeCloseTo(expectedEnterpriseValue / 20_000_000, 6);
    expect(result.peRatio).toBeCloseTo(expectedEquityValue / 12_000_000, 6);
    expect(result.ebitdaMargin).toBeCloseTo(20_000_000 / 80_000_000, 6);
  });

  it("returns null fields rather than NaN/Infinity when inputs are missing", () => {
    const result = calculateComparableMetrics({});
    expect(result.evToEbitda).toBeNull();
    expect(result.peRatio).toBeNull();
    expect(result.ebitdaMargin).toBeNull();
  });

  it("returns null EV/EBITDA when ebitda is zero even if price/shares are known", () => {
    const result = calculateComparableMetrics({ currentPrice: 50, shares: 100, ebitda: 0 });
    expect(result.evToEbitda).toBeNull();
  });
});

describe("averageEvToEbitda", () => {
  it("averages only the non-null values", () => {
    const avg = averageEvToEbitda([
      { evToEbitda: 10, peRatio: null, ebitdaMargin: null },
      { evToEbitda: 20, peRatio: null, ebitdaMargin: null },
      { evToEbitda: null, peRatio: null, ebitdaMargin: null }
    ]);
    expect(avg).toBeCloseTo(15, 6);
  });

  it("returns null when there are no comparables with a multiple", () => {
    expect(averageEvToEbitda([])).toBeNull();
    expect(averageEvToEbitda([{ evToEbitda: null, peRatio: null, ebitdaMargin: null }])).toBeNull();
  });
});
