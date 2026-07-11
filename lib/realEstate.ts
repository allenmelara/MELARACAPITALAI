export type RealEstateInputs = {
  purchasePrice: number;
  downPaymentPct: number;
  closingCosts: number;
  interestRate: number;
  loanTermYears: number;
  grossRentalIncome: number;
  vacancyRate: number;
  operatingExpenses: number;
  appreciationRate: number;
};

export function calculateRealEstateMetrics(input: RealEstateInputs) {
  const downPayment = input.purchasePrice * input.downPaymentPct;
  const loanAmount = Math.max(0, input.purchasePrice - downPayment);
  const totalCashInvested = downPayment + input.closingCosts;

  const effectiveRentalIncome = input.grossRentalIncome * (1 - input.vacancyRate);
  const noi = effectiveRentalIncome - input.operatingExpenses;

  const monthlyRate = input.interestRate / 12;
  const numPayments = input.loanTermYears * 12;
  const monthlyMortgagePayment =
    loanAmount <= 0 || numPayments <= 0
      ? 0
      : monthlyRate > 0
        ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
          (Math.pow(1 + monthlyRate, numPayments) - 1)
        : loanAmount / numPayments;

  const annualDebtService = monthlyMortgagePayment * 12;
  const capRate = input.purchasePrice ? noi / input.purchasePrice : 0;
  const dscr = annualDebtService ? noi / annualDebtService : 0;
  const annualCashFlow = noi - annualDebtService;
  const cashOnCashReturn = totalCashInvested ? annualCashFlow / totalCashInvested : 0;

  let remainingBalance = loanAmount;
  for (let month = 1; month <= Math.min(60, numPayments); month++) {
    const interestPortion = remainingBalance * monthlyRate;
    const principalPortion = monthlyMortgagePayment - interestPortion;
    remainingBalance = Math.max(0, remainingBalance - principalPortion);
  }
  const cumulativeFiveYearCashFlow = annualCashFlow * 5;
  const projectedPropertyValue = input.purchasePrice * Math.pow(1 + input.appreciationRate, 5);
  const projectedEquity = projectedPropertyValue - remainingBalance;
  const fiveYearReturn = totalCashInvested
    ? (projectedEquity - totalCashInvested + cumulativeFiveYearCashFlow) / totalCashInvested
    : 0;

  return {
    downPayment,
    loanAmount,
    totalCashInvested,
    noi,
    monthlyMortgagePayment,
    annualDebtService,
    capRate,
    dscr,
    annualCashFlow,
    cashOnCashReturn,
    projectedPropertyValue,
    projectedEquity,
    fiveYearReturn
  };
}
