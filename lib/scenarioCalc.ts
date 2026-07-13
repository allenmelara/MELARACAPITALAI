import { calculateDebtPayoff } from "@/lib/debtCalc";
import type { Debt } from "@/lib/debts";

// Pure calculators, deliberately dependency-free (no supabase/server import)
// so they can be called from anywhere — same convention as debtCalc.ts /
// goalCalc.ts / budgetCalc.ts. These back the AI coach's "what if" tools
// (lib/coachContext.ts) with real math instead of letting the model guess.

export type SavingsGrowthResult = {
  months: number;
  totalContributed: number;
  projectedValue: number;
  projectedGrowth: number;
  annualReturn: number;
};

// Future value of a recurring monthly contribution, compounded monthly —
// same compounding-loop style as lib/wealth.ts's calculateWealthMetrics.
export function simulateSavingsGrowth(params: {
  extraMonthlyAmount: number;
  months: number;
  annualReturn?: number;
}): SavingsGrowthResult {
  const { extraMonthlyAmount, months, annualReturn = 0.07 } = params;
  const monthlyRate = annualReturn / 12;

  let balance = 0;
  for (let month = 1; month <= months; month++) {
    balance = balance * (1 + monthlyRate) + extraMonthlyAmount;
  }

  const totalContributed = extraMonthlyAmount * months;
  return {
    months,
    totalContributed,
    projectedValue: balance,
    projectedGrowth: balance - totalContributed,
    annualReturn
  };
}

// Overall payoff month across all debts (the last one to reach zero) —
// null if any debt isn't paid off within the simulation window.
export function monthsToPayoff(debts: Debt[], payoffMonths: Record<string, number | null>): number | null {
  if (debts.length === 0) return 0;
  const values = Object.values(payoffMonths);
  return values.some((m) => m === null) ? null : Math.max(...(values as number[]));
}

export type DebtVsInvestingComparison = {
  extraMonthlyAmount: number;
  horizonMonths: number;
  assumedAnnualReturn: number;
  debtPayoff: {
    baselineMonthsToPayoff: number | null; // null = not fully paid off within the simulation window
    acceleratedMonthsToPayoff: number | null;
    monthsSaved: number | null;
    baselineTotalInterest: number;
    acceleratedTotalInterest: number;
    interestSaved: number;
  };
  investing: SavingsGrowthResult;
};

// Compares directing extraMonthlyAmount at debt payoff vs. investing it
// instead, over the same horizon — real numbers on both sides, no verdict
// baked in (the AI narrates the tradeoff from these figures).
export function compareDebtPayoffVsInvesting(params: {
  debts: Debt[];
  extraMonthlyAmount: number;
  horizonMonths?: number;
  annualReturn?: number;
}): DebtVsInvestingComparison {
  const { debts, extraMonthlyAmount, horizonMonths = 60, annualReturn = 0.07 } = params;

  const baseline = calculateDebtPayoff(debts, 0);
  const accelerated = calculateDebtPayoff(debts, extraMonthlyAmount);

  const baselineMonthsToPayoff = monthsToPayoff(debts, baseline.payoffMonths);
  const acceleratedMonthsToPayoff = monthsToPayoff(debts, accelerated.payoffMonths);

  const investing = simulateSavingsGrowth({ extraMonthlyAmount, months: horizonMonths, annualReturn });

  return {
    extraMonthlyAmount,
    horizonMonths,
    assumedAnnualReturn: annualReturn,
    debtPayoff: {
      baselineMonthsToPayoff,
      acceleratedMonthsToPayoff,
      monthsSaved:
        baselineMonthsToPayoff !== null && acceleratedMonthsToPayoff !== null
          ? baselineMonthsToPayoff - acceleratedMonthsToPayoff
          : null,
      baselineTotalInterest: baseline.totalInterestPaid,
      acceleratedTotalInterest: accelerated.totalInterestPaid,
      interestSaved: baseline.totalInterestPaid - accelerated.totalInterestPaid
    },
    investing
  };
}
