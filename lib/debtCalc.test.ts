import { describe, expect, it } from "vitest";
import { calculateDebtPayoff } from "./debtCalc";
import type { Debt } from "./debts";

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: "1",
    name: "Test debt",
    debtType: "credit_card",
    balance: 1000,
    interestRate: 12,
    minimumPayment: 100,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("calculateDebtPayoff", () => {
  it("returns an all-zero series for no debts", () => {
    const { series, payoffMonths } = calculateDebtPayoff([]);
    expect(series[0].totalBalance).toBe(0);
    expect(payoffMonths).toEqual({});
  });

  it("marks an already-paid-off debt as month 0", () => {
    const debt = makeDebt({ balance: 0 });
    const { payoffMonths } = calculateDebtPayoff([debt]);
    expect(payoffMonths[debt.id]).toBe(0);
  });

  it("pays off a debt with a payment larger than monthly interest", () => {
    const debt = makeDebt({ balance: 1000, interestRate: 12, minimumPayment: 200 });
    const { payoffMonths, series } = calculateDebtPayoff([debt]);
    expect(payoffMonths[debt.id]).not.toBeNull();
    expect(series[series.length - 1].totalBalance).toBe(0);
  });

  it("never pays off a debt whose payment doesn't cover monthly interest", () => {
    const debt = makeDebt({ balance: 1000, interestRate: 24, minimumPayment: 1 });
    const { payoffMonths, series } = calculateDebtPayoff([debt]);
    expect(payoffMonths[debt.id]).toBeNull();
    expect(series[series.length - 1].totalBalance).toBeGreaterThan(debt.balance);
  });

  it("sums balances across multiple debts", () => {
    const debts = [makeDebt({ id: "a", balance: 500 }), makeDebt({ id: "b", balance: 1500 })];
    const { series } = calculateDebtPayoff(debts);
    expect(series[0].totalBalance).toBe(2000);
  });
});
