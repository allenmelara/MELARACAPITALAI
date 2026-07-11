import { describe, expect, it } from "vitest";
import { calculateCompanyMetrics, type CompanyInputs } from "./finance";
import { calculateKeyRatios } from "./ratios";
import type { FinancialStatements } from "./secEdgar";

const inputs: CompanyInputs = {
  revenue: 1_000_000,
  ebitda: 200_000,
  netIncome: 100_000,
  cash: 50_000,
  debt: 300_000,
  shares: 100_000,
  currentPrice: 10,
  growthRate: 0.1,
  discountRate: 0.12,
  terminalGrowthRate: 0.02,
  taxRate: 0.21,
  depreciationPct: 0.03,
  capexPct: 0.04,
  nwcChangePct: 0.01
};

const metrics = calculateCompanyMetrics(inputs);

const statements: FinancialStatements = {
  periods: ["FY2023"],
  periodEnds: ["2023-12-31"],
  incomeStatement: [],
  balanceSheet: [
    { key: "currentAssets", label: "Total current assets", values: [400_000] },
    { key: "currentLiabilities", label: "Total current liabilities", values: [200_000] },
    { key: "totalAssets", label: "Total assets", values: [1_500_000] },
    { key: "equity", label: "Total equity", values: [600_000] }
  ],
  cashFlow: []
};

describe("calculateKeyRatios", () => {
  it("reuses the already-computed valuation metrics for profitability/multiples", () => {
    const ratios = calculateKeyRatios(inputs, metrics, statements);
    expect(ratios.ebitdaMargin).toBe(metrics.ebitdaMargin);
    expect(ratios.netMargin).toBe(metrics.netMargin);
    expect(ratios.evToEbitda).toBe(metrics.evToEbitda);
    expect(ratios.peRatio).toBe(metrics.priceToEarnings);
  });

  it("computes debt/EBITDA from inputs alone, with no statements needed", () => {
    const ratios = calculateKeyRatios(inputs, metrics, null);
    expect(ratios.debtToEbitda).toBeCloseTo(300_000 / 200_000, 6);
  });

  it("computes balance-sheet-dependent ratios when statements are present", () => {
    const ratios = calculateKeyRatios(inputs, metrics, statements);
    expect(ratios.currentRatio).toBeCloseTo(400_000 / 200_000, 6);
    expect(ratios.debtToEquity).toBeCloseTo(300_000 / 600_000, 6);
    expect(ratios.returnOnEquity).toBeCloseTo(100_000 / 600_000, 6);
    expect(ratios.returnOnAssets).toBeCloseTo(100_000 / 1_500_000, 6);
  });

  it("returns null for balance-sheet ratios when statements are absent (manual entry)", () => {
    const ratios = calculateKeyRatios(inputs, metrics, null);
    expect(ratios.currentRatio).toBeNull();
    expect(ratios.debtToEquity).toBeNull();
    expect(ratios.returnOnEquity).toBeNull();
    expect(ratios.returnOnAssets).toBeNull();
  });

  it("returns null for debtToEbitda when EBITDA is zero, rather than dividing by zero", () => {
    const ratios = calculateKeyRatios({ ...inputs, ebitda: 0 }, calculateCompanyMetrics({ ...inputs, ebitda: 0 }), null);
    expect(ratios.debtToEbitda).toBeNull();
  });
});
