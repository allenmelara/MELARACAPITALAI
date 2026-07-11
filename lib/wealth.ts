export type WealthInputs = {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentAssets: number;
  currentLiabilities: number;
  currentRetirementSavings: number;
  monthlyRetirementContribution: number;
  expectedAnnualReturn: number;
  yearsToRetirement: number;
  emergencyFundMonths: number;
  withdrawalRate: number;
};

export function calculateWealthMetrics(input: WealthInputs) {
  const monthlyCashFlow = input.monthlyIncome - input.monthlyExpenses;
  const savingsRate = input.monthlyIncome ? monthlyCashFlow / input.monthlyIncome : 0;
  const emergencyFundTarget = input.monthlyExpenses * input.emergencyFundMonths;
  const currentNetWorth = input.currentAssets - input.currentLiabilities;

  const monthlyRate = input.expectedAnnualReturn / 12;

  let fiveYearNetWorthProjection = currentNetWorth;
  for (let month = 1; month <= 60; month++) {
    fiveYearNetWorthProjection = fiveYearNetWorthProjection * (1 + monthlyRate) + Math.max(monthlyCashFlow, 0);
  }

  const retirementMonths = Math.max(0, Math.round(input.yearsToRetirement * 12));
  let retirementBalance = input.currentRetirementSavings;
  for (let month = 1; month <= retirementMonths; month++) {
    retirementBalance = retirementBalance * (1 + monthlyRate) + input.monthlyRetirementContribution;
  }
  const sustainableAnnualRetirementIncome = retirementBalance * input.withdrawalRate;

  return {
    monthlyCashFlow,
    savingsRate,
    emergencyFundTarget,
    currentNetWorth,
    fiveYearNetWorthProjection,
    retirementBalance,
    sustainableAnnualRetirementIncome
  };
}
