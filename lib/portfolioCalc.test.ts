import { describe, expect, it } from "vitest";
import { mergeHoldingLot } from "./portfolioCalc";

describe("mergeHoldingLot", () => {
  it("computes a weighted-average cost basis across two lots", () => {
    // 10 shares @ $100 + 10 shares @ $200 -> 20 shares @ $150
    expect(mergeHoldingLot({ shares: 10, costBasis: 100 }, { shares: 10, costBasis: 200 })).toEqual({
      shares: 20,
      costBasis: 150
    });
  });

  it("weights the average toward the larger lot", () => {
    // 30 shares @ $100 + 10 shares @ $200 -> 40 shares @ $125
    expect(mergeHoldingLot({ shares: 30, costBasis: 100 }, { shares: 10, costBasis: 200 })).toEqual({
      shares: 40,
      costBasis: 125
    });
  });

  it("returns zero shares/cost basis if the merged total is zero or negative", () => {
    expect(mergeHoldingLot({ shares: 0, costBasis: 0 }, { shares: 0, costBasis: 0 })).toEqual({
      shares: 0,
      costBasis: 0
    });
  });

  it("returns the incoming lot's values when the existing position is empty", () => {
    expect(mergeHoldingLot({ shares: 0, costBasis: 0 }, { shares: 5, costBasis: 300 })).toEqual({
      shares: 5,
      costBasis: 300
    });
  });
});
