import { totalSpending, type BudgetCategoryEntry } from "@/lib/budgetCalc";

// Pure, dependency-free (no supabase/server import). "Investment consistency"
// is deliberately defined around the monthly_budgets "Savings/Investments"
// category rather than portfolio value or goal-progress updates — there's no
// reliable per-contribution history anywhere else (portfolio value swings
// with the market, and financial_goals.updateGoalProgress overwrites without
// an audit log), so this is the one honest, data-grounded signal available.

export type Streak = { currentMonths: number; longestMonths: number };

type MonthlyBudgetLike = { categories: BudgetCategoryEntry[]; income: number };

function calculateStreak(history: MonthlyBudgetLike[], isQualifyingMonth: (b: MonthlyBudgetLike) => boolean): Streak {
  if (history.length === 0) return { currentMonths: 0, longestMonths: 0 };

  let longestMonths = 0;
  let run = 0;
  for (const month of history) {
    if (isQualifyingMonth(month)) {
      run += 1;
      longestMonths = Math.max(longestMonths, run);
    } else {
      run = 0;
    }
  }

  // Current streak: walk backward from the most recent month until the
  // first non-qualifying one.
  let currentMonths = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (isQualifyingMonth(history[i])) currentMonths += 1;
    else break;
  }

  return { currentMonths, longestMonths };
}

export function calculateSavingsStreak(history: MonthlyBudgetLike[]): Streak {
  return calculateStreak(history, (b) => b.income - totalSpending(b) > 0);
}

export function calculateInvestmentConsistencyStreak(history: MonthlyBudgetLike[]): Streak {
  return calculateStreak(history, (b) => (b.categories.find((c) => c.category === "Savings/Investments")?.amount ?? 0) > 0);
}
