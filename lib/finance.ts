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
};

export function calculateCompanyMetrics(input: CompanyInputs) {
  const enterpriseValue = input.currentPrice * input.shares + input.debt - input.cash;
  const equityValue = input.currentPrice * input.shares;
  const ebitdaMargin = input.revenue ? input.ebitda / input.revenue : 0;
  const netMargin = input.revenue ? input.netIncome / input.revenue : 0;
  const evToEbitda = input.ebitda ? enterpriseValue / input.ebitda : 0;
  const priceToEarnings = input.netIncome ? equityValue / input.netIncome : 0;

  // Unlevered FCF projection: Revenue -> EBITDA (at today's margin) -> EBIT
  // (less D&A) -> NOPAT (after tax) -> + D&A - Capex - change in NWC, all
  // expressed as a % of each projected year's revenue.
  let revenue = input.revenue;
  let pv = 0;
  let unleveredFcf = 0;
  const projection: Array<{
    year: number;
    revenue: number;
    unleveredFcf: number;
    discountedFcf: number;
  }> = [];
  for (let year = 1; year <= 5; year++) {
    revenue *= 1 + input.growthRate;
    const ebitda = revenue * ebitdaMargin;
    const depreciation = revenue * input.depreciationPct;
    const ebit = ebitda - depreciation;
    const nopat = ebit * (1 - input.taxRate);
    const capex = revenue * input.capexPct;
    const nwcChange = revenue * input.nwcChangePct;
    unleveredFcf = nopat + depreciation - capex - nwcChange;
    const discountedFcf = unleveredFcf / Math.pow(1 + input.discountRate, year);
    pv += discountedFcf;
    projection.push({ year, revenue, unleveredFcf, discountedFcf });
  }

  const terminalValue =
    input.discountRate > input.terminalGrowthRate
      ? (unleveredFcf * (1 + input.terminalGrowthRate)) /
        (input.discountRate - input.terminalGrowthRate)
      : 0;

  const dcfEnterpriseValue = pv + terminalValue / Math.pow(1 + input.discountRate, 5);

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
