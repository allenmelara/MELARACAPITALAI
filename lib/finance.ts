export type TerminalMethod = "growth" | "exitMultiple";

export type CompanyInputs = {
  revenue: number;
  ebitda: number;
  netIncome: number;
  cash: number;
  debt: number;
  shares: number;
  currentPrice: number;
  growthRate: number;
  discountRate: number;
  terminalGrowthRate: number;
  taxRate: number;
  depreciationPct: number;
  capexPct: number;
  nwcChangePct: number;
  // Advanced/optional model settings. All default to the values that
  // reproduce the original fixed 5-year, perpetuity-growth DCF, so any
  // caller that omits them sees unchanged behavior.
  projectionYears?: number;
  terminalMethod?: TerminalMethod;
  exitMultiple?: number;
  ebitdaMarginOverride?: number;
};

export function calculateCompanyMetrics(input: CompanyInputs) {
  const enterpriseValue = input.currentPrice * input.shares + input.debt - input.cash;
  const equityValue = input.currentPrice * input.shares;
  const ebitdaMargin = input.revenue ? input.ebitda / input.revenue : 0;
  const netMargin = input.revenue ? input.netIncome / input.revenue : 0;
  const evToEbitda = input.ebitda ? enterpriseValue / input.ebitda : 0;
  const priceToEarnings = input.netIncome ? equityValue / input.netIncome : 0;

  const projectionYears =
    input.projectionYears && input.projectionYears > 0 ? Math.round(input.projectionYears) : 5;
  // The margin assumption used going forward — defaults to today's reported
  // margin, but can be overridden (e.g. an analyst expecting margin expansion).
  const projectedEbitdaMargin = input.ebitdaMarginOverride ?? ebitdaMargin;

  // Unlevered FCF projection: Revenue -> EBITDA (at the projected margin) ->
  // EBIT (less D&A) -> NOPAT (after tax) -> + D&A - Capex - change in NWC,
  // all expressed as a % of each projected year's revenue.
  let revenue = input.revenue;
  let pv = 0;
  let unleveredFcf = 0;
  let finalYearEbitda = 0;
  const projection: Array<{
    year: number;
    revenue: number;
    unleveredFcf: number;
    discountedFcf: number;
  }> = [];
  for (let year = 1; year <= projectionYears; year++) {
    revenue *= 1 + input.growthRate;
    const yearEbitda = revenue * projectedEbitdaMargin;
    const depreciation = revenue * input.depreciationPct;
    const ebit = yearEbitda - depreciation;
    const nopat = ebit * (1 - input.taxRate);
    const capex = revenue * input.capexPct;
    const nwcChange = revenue * input.nwcChangePct;
    unleveredFcf = nopat + depreciation - capex - nwcChange;
    const discountedFcf = unleveredFcf / Math.pow(1 + input.discountRate, year);
    pv += discountedFcf;
    finalYearEbitda = yearEbitda;
    projection.push({ year, revenue, unleveredFcf, discountedFcf });
  }

  // Terminal value: either a Gordon-growth perpetuity on the final year's
  // unlevered FCF (default), or an EV/EBITDA exit multiple applied to the
  // final projected year's EBITDA.
  const terminalValue =
    input.terminalMethod === "exitMultiple"
      ? (input.exitMultiple ?? 0) * finalYearEbitda
      : input.discountRate > input.terminalGrowthRate
        ? (unleveredFcf * (1 + input.terminalGrowthRate)) /
          (input.discountRate - input.terminalGrowthRate)
        : 0;

  const dcfEnterpriseValue = pv + terminalValue / Math.pow(1 + input.discountRate, projectionYears);

  const dcfEquityValue = dcfEnterpriseValue - input.debt + input.cash;
  const impliedSharePrice = input.shares ? dcfEquityValue / input.shares : 0;

  return {
    enterpriseValue,
    equityValue,
    ebitdaMargin,
    netMargin,
    evToEbitda,
    priceToEarnings,
    dcfEnterpriseValue,
    dcfEquityValue,
    impliedSharePrice,
    upside:
      input.currentPrice > 0
        ? impliedSharePrice / input.currentPrice - 1
        : 0,
    projectionYears,
    projection
  };
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function percent(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1
  }).format(value || 0);
}
