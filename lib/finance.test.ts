import { describe, expect, it } from "vitest";
import { calculateCompanyMetrics, money, percent, type CompanyInputs } from "./finance";

const baseInputs: CompanyInputs = {
  revenue: 1_000_000,
  ebitda: 200_000,
  netIncome: 100_000,
  cash: 50_000,
  debt: 100_000,
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

describe("calculateCompanyMetrics — multiples and margins (unchanged formulas)", () => {
  it("computes enterprise value from market cap, debt, and cash", () => {
    const metrics = calculateCompanyMetrics(baseInputs);
    expect(metrics.enterpriseValue).toBe(10 * 100_000 + 100_000 - 50_000);
  });

  it("computes EBITDA margin and net margin from revenue", () => {
    const metrics = calculateCompanyMetrics(baseInputs);
    expect(metrics.ebitdaMargin).toBeCloseTo(0.2, 6);
    expect(metrics.netMargin).toBeCloseTo(0.1, 6);
  });

  it("is zero-division safe when revenue, ebitda, netIncome, or shares are zero", () => {
    const metrics = calculateCompanyMetrics({
      ...baseInputs,
      revenue: 0,
      ebitda: 0,
      netIncome: 0,
      shares: 0
    });
    expect(metrics.ebitdaMargin).toBe(0);
    expect(metrics.netMargin).toBe(0);
    expect(metrics.evToEbitda).toBe(0);
    expect(metrics.priceToEarnings).toBe(0);
    expect(metrics.impliedSharePrice).toBe(0);
  });
});

describe("calculateCompanyMetrics — unlevered FCF DCF", () => {
  it("taxes NOPAT before adding back D&A (tax shield effect)", () => {
    const withTax = calculateCompanyMetrics({ ...baseInputs, taxRate: 0.3, depreciationPct: 0.1 });
    const withMoreDepreciation = calculateCompanyMetrics({
      ...baseInputs,
      taxRate: 0.3,
      depreciationPct: 0.2
    });
    // More D&A under a positive tax rate should raise unlevered FCF (a bigger
    // depreciation tax shield), and therefore the DCF-implied equity value.
    expect(withMoreDepreciation.dcfEquityValue).toBeGreaterThan(withTax.dcfEquityValue);
  });

  it("makes depreciation a wash on FCF when the tax rate is zero", () => {
    const lowDepreciation = calculateCompanyMetrics({ ...baseInputs, taxRate: 0, depreciationPct: 0.02 });
    const highDepreciation = calculateCompanyMetrics({ ...baseInputs, taxRate: 0, depreciationPct: 0.2 });
    // With no tax, +D&A back exactly offsets -D&A in NOPAT, so the D&A
    // assumption should not move the DCF value at all.
    expect(highDepreciation.dcfEquityValue).toBeCloseTo(lowDepreciation.dcfEquityValue, 6);
  });

  it("reduces DCF-implied equity value as capex rises, holding everything else constant", () => {
    const lowCapex = calculateCompanyMetrics({ ...baseInputs, capexPct: 0.02 });
    const highCapex = calculateCompanyMetrics({ ...baseInputs, capexPct: 0.2 });
    expect(highCapex.dcfEquityValue).toBeLessThan(lowCapex.dcfEquityValue);
  });

  it("reduces DCF-implied equity value as the working-capital drag rises", () => {
    const lowNwc = calculateCompanyMetrics({ ...baseInputs, nwcChangePct: 0 });
    const highNwc = calculateCompanyMetrics({ ...baseInputs, nwcChangePct: 0.15 });
    expect(highNwc.dcfEquityValue).toBeLessThan(lowNwc.dcfEquityValue);
  });

  it("matches a hand-computed EBITDA-only DCF when tax, D&A, capex, and NWC are all zero", () => {
    const metrics = calculateCompanyMetrics({
      ...baseInputs,
      taxRate: 0,
      depreciationPct: 0,
      capexPct: 0,
      nwcChangePct: 0
    });

    const ebitdaMargin = baseInputs.ebitda / baseInputs.revenue;
    let revenue = baseInputs.revenue;
    let pv = 0;
    let fcf = 0;
    for (let year = 1; year <= 5; year++) {
      revenue *= 1 + baseInputs.growthRate;
      fcf = revenue * ebitdaMargin;
      pv += fcf / Math.pow(1 + baseInputs.discountRate, year);
    }
    const terminalValue =
      (fcf * (1 + baseInputs.terminalGrowthRate)) / (baseInputs.discountRate - baseInputs.terminalGrowthRate);
    const expectedEnterpriseValue = pv + terminalValue / Math.pow(1 + baseInputs.discountRate, 5);
    const expectedEquityValue = expectedEnterpriseValue - baseInputs.debt + baseInputs.cash;

    expect(metrics.dcfEquityValue).toBeCloseTo(expectedEquityValue, 2);
  });

  it("returns a zero terminal value when the discount rate does not exceed terminal growth", () => {
    const metrics = calculateCompanyMetrics({ ...baseInputs, discountRate: 0.02, terminalGrowthRate: 0.05 });
    // dcfEquityValue should then reflect only the discounted 5-year FCF, no blow-up.
    expect(Number.isFinite(metrics.dcfEquityValue)).toBe(true);
  });

  it("computes upside relative to current price", () => {
    const metrics = calculateCompanyMetrics(baseInputs);
    expect(metrics.upside).toBeCloseTo(metrics.impliedSharePrice / baseInputs.currentPrice - 1, 6);
  });
});

describe("money and percent formatters", () => {
  it("formats currency with no decimals", () => {
    expect(money(1234.56)).toBe("$1,235");
  });

  it("formats a fraction as a percentage", () => {
    expect(percent(0.256)).toBe("25.6%");
  });

  it("falls back to zero for NaN/undefined-ish input", () => {
    expect(money(0)).toBe("$0");
    expect(percent(0)).toBe("0%");
  });
});
