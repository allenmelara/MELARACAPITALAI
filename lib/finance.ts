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
};

export function calculateCompanyMetrics(input: CompanyInputs) {
  const enterpriseValue = input.currentPrice * input.shares + input.debt - input.cash;
  const equityValue = input.currentPrice * input.shares;
  const ebitdaMargin = input.revenue ? input.ebitda / input.revenue : 0;
  const netMargin = input.revenue ? input.netIncome / input.revenue : 0;
  const evToEbitda = input.ebitda ? enterpriseValue / input.ebitda : 0;
  const priceToEarnings = input.netIncome ? equityValue / input.netIncome : 0;

  let cashFlow = Math.max(input.netIncome, 0);
  let pv = 0;
  for (let year = 1; year <= 5; year++) {
    cashFlow *= 1 + input.growthRate;
    pv += cashFlow / Math.pow(1 + input.discountRate, year);
  }

  const terminalValue =
    input.discountRate > input.terminalGrowthRate
      ? (cashFlow * (1 + input.terminalGrowthRate)) /
        (input.discountRate - input.terminalGrowthRate)
      : 0;

  const dcfEnterpriseValue =
    pv + terminalValue / Math.pow(1 + input.discountRate, 5);

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
        : 0
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
