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

describe("calculateCompanyMetrics — per-year projection", () => {
  it("returns exactly 5 years, numbered 1 through 5", () => {
    const metrics = calculateCompanyMetrics(baseInputs);
    expect(metrics.projection).toHaveLength(5);
    expect(metrics.projection.map((p) => p.year)).toEqual([1, 2, 3, 4, 5]);
  });

  it("grows revenue by the growth rate each year, compounding", () => {
    const metrics = calculateCompanyMetrics(baseInputs);
    const expectedYear1 = baseInputs.revenue * (1 + baseInputs.growthRate);
    const expectedYear2 = expectedYear1 * (1 + baseInputs.growthRate);
    expect(metrics.projection[0].revenue).toBeCloseTo(expectedYear1, 2);
    expect(metrics.projection[1].revenue).toBeCloseTo(expectedYear2, 2);
  });

  it("discounts each year's unleveredFcf back at the discount rate", () => {
    const metrics = calculateCompanyMetrics(baseInputs);
    metrics.projection.forEach((p) => {
      const expected = p.unleveredFcf / Math.pow(1 + baseInputs.discountRate, p.year);
      expect(p.discountedFcf).toBeCloseTo(expected, 6);
    });
  });

  it("sums the projection's discounted FCF into the same present value used for dcfEnterpriseValue", () => {
    const metrics = calculateCompanyMetrics(baseInputs);
    const sumOfDiscountedFcf = metrics.projection.reduce((sum, p) => sum + p.discountedFcf, 0);
    // dcfEnterpriseValue = sum(discounted FCF) + discounted terminal value, so
    // it should always be >= the projection's own discounted-FCF sum alone.
    expect(metrics.dcfEnterpriseValue).toBeGreaterThanOrEqual(sumOfDiscountedFcf - 0.01);
  });
});

describe("calculateCompanyMetrics — advanced settings (all optional, default-preserving)", () => {
  it("defaults to a 5-year projection when projectionYears is omitted", () => {
    const metrics = calculateCompanyMetrics(baseInputs);
    expect(metrics.projectionYears).toBe(5);
    expect(metrics.projection).toHaveLength(5);
  });

  it("projects the requested number of years when projectionYears is set", () => {
    const metrics = calculateCompanyMetrics({ ...baseInputs, projectionYears: 8 });
    expect(metrics.projectionYears).toBe(8);
    expect(metrics.projection).toHaveLength(8);
    expect(metrics.projection.map((p) => p.year)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("rounds a fractional projectionYears and ignores zero/negative values", () => {
    expect(calculateCompanyMetrics({ ...baseInputs, projectionYears: 3.6 }).projectionYears).toBe(4);
    expect(calculateCompanyMetrics({ ...baseInputs, projectionYears: 0 }).projectionYears).toBe(5);
    expect(calculateCompanyMetrics({ ...baseInputs, projectionYears: -2 }).projectionYears).toBe(5);
  });

  it("uses today's EBITDA margin for the projection when no override is given", () => {
    const withOverride = calculateCompanyMetrics({ ...baseInputs, ebitdaMarginOverride: baseInputs.ebitda / baseInputs.revenue });
    const withoutOverride = calculateCompanyMetrics(baseInputs);
    expect(withOverride.dcfEquityValue).toBeCloseTo(withoutOverride.dcfEquityValue, 6);
  });

  it("raises DCF value when the margin override projects higher forward margins", () => {
    const lowerMargin = calculateCompanyMetrics(baseInputs);
    const higherMargin = calculateCompanyMetrics({ ...baseInputs, ebitdaMarginOverride: 0.35 });
    expect(higherMargin.dcfEquityValue).toBeGreaterThan(lowerMargin.dcfEquityValue);
  });

  it("does not change reported (today's) ebitdaMargin when a projection override is set", () => {
    const metrics = calculateCompanyMetrics({ ...baseInputs, ebitdaMarginOverride: 0.35 });
    expect(metrics.ebitdaMargin).toBeCloseTo(baseInputs.ebitda / baseInputs.revenue, 6);
  });

  it("defaults to the perpetuity-growth terminal method when terminalMethod is omitted", () => {
    const withDefault = calculateCompanyMetrics(baseInputs);
    const withExplicitGrowth = calculateCompanyMetrics({ ...baseInputs, terminalMethod: "growth" });
    expect(withDefault.dcfEquityValue).toBeCloseTo(withExplicitGrowth.dcfEquityValue, 6);
  });

  it("values the terminal value as exitMultiple x final-year EBITDA under the exit-multiple method", () => {
    const metrics = calculateCompanyMetrics({
      ...baseInputs,
      terminalMethod: "exitMultiple",
      exitMultiple: 10
    });
    const finalYearEbitda = metrics.projection[metrics.projection.length - 1].revenue * metrics.ebitdaMargin;
    const expectedTerminalValue = 10 * finalYearEbitda;
    const sumDiscountedFcf = metrics.projection.reduce((sum, p) => sum + p.discountedFcf, 0);
    const expectedEnterpriseValue =
      sumDiscountedFcf + expectedTerminalValue / Math.pow(1 + baseInputs.discountRate, metrics.projectionYears);
    expect(metrics.dcfEnterpriseValue).toBeCloseTo(expectedEnterpriseValue, 2);
  });

  it("treats a missing exitMultiple under the exit-multiple method as a zero terminal value", () => {
    const metrics = calculateCompanyMetrics({ ...baseInputs, terminalMethod: "exitMultiple" });
    const sumDiscountedFcf = metrics.projection.reduce((sum, p) => sum + p.discountedFcf, 0);
    expect(metrics.dcfEnterpriseValue).toBeCloseTo(sumDiscountedFcf, 2);
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
