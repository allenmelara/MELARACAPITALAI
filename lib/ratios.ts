import type { CompanyInputs, calculateCompanyMetrics } from "@/lib/finance";
import type { FinancialStatements } from "@/lib/secEdgar";

export type KeyRatios = {
  // Profitability — from the already-computed valuation metrics.
  ebitdaMargin: number;
  netMargin: number;
  evToEbitda: number;
  peRatio: number;
  // Leverage — derivable from user inputs alone.
  debtToEbitda: number | null;
  // Balance-sheet-dependent ratios: null when statements weren't imported
  // (e.g. a manually-entered company) or the filer didn't tag the line item.
  currentRatio: number | null;
  debtToEquity: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
};

function latestValue(statements: FinancialStatements | null | undefined, key: string): number | null {
  const row = [
    ...(statements?.incomeStatement ?? []),
    ...(statements?.balanceSheet ?? []),
    ...(statements?.cashFlow ?? [])
  ].find((r) => r.key === key);
  const value = row?.values[0];
  return value === undefined ? null : value;
}

export function calculateKeyRatios(
  inputs: CompanyInputs,
  metrics: ReturnType<typeof calculateCompanyMetrics>,
  statements?: FinancialStatements | null
): KeyRatios {
  const currentAssets = latestValue(statements, "currentAssets");
  const currentLiabilities = latestValue(statements, "currentLiabilities");
  const equity = latestValue(statements, "equity");
  const totalAssets = latestValue(statements, "totalAssets");

  return {
    ebitdaMargin: metrics.ebitdaMargin,
    netMargin: metrics.netMargin,
    evToEbitda: metrics.evToEbitda,
    peRatio: metrics.priceToEarnings,
    debtToEbitda: inputs.ebitda ? inputs.debt / inputs.ebitda : null,
    currentRatio:
      currentAssets !== null && currentLiabilities ? currentAssets / currentLiabilities : null,
    debtToEquity: equity ? inputs.debt / equity : null,
    returnOnEquity: equity ? inputs.netIncome / equity : null,
    returnOnAssets: totalAssets ? inputs.netIncome / totalAssets : null
  };
}
