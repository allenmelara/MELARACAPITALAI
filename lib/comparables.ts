export type ComparableInputs = {
  currentPrice?: number;
  shares?: number;
  debt?: number;
  cash?: number;
  ebitda?: number;
  netIncome?: number;
  revenue?: number;
};

export type ComparableMetrics = {
  evToEbitda: number | null;
  peRatio: number | null;
  ebitdaMargin: number | null;
};

export function calculateComparableMetrics(input: ComparableInputs): ComparableMetrics {
  const equityValue =
    input.currentPrice && input.shares ? input.currentPrice * input.shares : null;
  const enterpriseValue =
    equityValue !== null ? equityValue + (input.debt ?? 0) - (input.cash ?? 0) : null;

  const evToEbitda =
    enterpriseValue !== null && input.ebitda ? enterpriseValue / input.ebitda : null;
  const peRatio = equityValue !== null && input.netIncome ? equityValue / input.netIncome : null;
  const ebitdaMargin = input.ebitda && input.revenue ? input.ebitda / input.revenue : null;

  return { evToEbitda, peRatio, ebitdaMargin };
}

export function averageEvToEbitda(comparables: ComparableMetrics[]): number | null {
  const values = comparables
    .map((c) => c.evToEbitda)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
