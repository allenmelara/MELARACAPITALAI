import { describe, expect, it } from "vitest";
import { calculateRealEstateMetrics, type RealEstateInputs } from "./realEstate";

const baseInputs: RealEstateInputs = {
  purchasePrice: 400000,
  downPaymentPct: 0.25,
  closingCosts: 8000,
  interestRate: 0.065,
  loanTermYears: 30,
  grossRentalIncome: 42000,
  vacancyRate: 0.05,
  operatingExpenses: 14000,
  appreciationRate: 0.03
};

describe("calculateRealEstateMetrics", () => {
  it("computes NOI as effective rental income minus operating expenses", () => {
    const metrics = calculateRealEstateMetrics(baseInputs);
    const effectiveIncome = baseInputs.grossRentalIncome * (1 - baseInputs.vacancyRate);
    expect(metrics.noi).toBeCloseTo(effectiveIncome - baseInputs.operatingExpenses, 2);
  });

  it("computes cap rate as NOI over purchase price", () => {
    const metrics = calculateRealEstateMetrics(baseInputs);
    expect(metrics.capRate).toBeCloseTo(metrics.noi / baseInputs.purchasePrice, 6);
  });

  it("produces a fully amortizing monthly payment", () => {
    const metrics = calculateRealEstateMetrics(baseInputs);
    const loanAmount = baseInputs.purchasePrice * (1 - baseInputs.downPaymentPct);
    const monthlyRate = baseInputs.interestRate / 12;
    const n = baseInputs.loanTermYears * 12;
    const expected =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
    expect(metrics.monthlyMortgagePayment).toBeCloseTo(expected, 2);
  });

  it("flags a deal with negative cash flow via DSCR below 1", () => {
    const metrics = calculateRealEstateMetrics({
      ...baseInputs,
      grossRentalIncome: 20000,
      operatingExpenses: 12000
    });
    expect(metrics.dscr).toBeLessThan(1);
    expect(metrics.annualCashFlow).toBeLessThan(0);
  });

  it("returns zero-division-safe output for an all-cash purchase", () => {
    const metrics = calculateRealEstateMetrics({ ...baseInputs, downPaymentPct: 1 });
    expect(metrics.monthlyMortgagePayment).toBe(0);
    expect(metrics.annualDebtService).toBe(0);
    expect(Number.isFinite(metrics.dscr)).toBe(true);
  });
});
