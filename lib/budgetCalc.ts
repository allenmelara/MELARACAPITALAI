// Pure helpers, deliberately dependency-free (no supabase/server import) so
// client components (MonthlyBudgetSection, IncomeSpendingChart,
// SavingsProgressChart) can import them directly without pulling a
// server-only module into the browser bundle — see lib/monthlyBudget.ts for
// the CRUD half of this feature.

// Fixed category list — a lightweight monthly check-in, not a transaction
// ledger. The user enters one total per category per month by hand.
export const BUDGET_CATEGORIES = [
  "Housing",
  "Transportation",
  "Food",
  "Utilities",
  "Insurance",
  "Debt Payments",
  "Entertainment",
  "Healthcare",
  "Personal",
  "Savings/Investments",
  "Other"
] as const;

export type BudgetCategoryEntry = { category: string; amount: number };

export function currentMonthKey(today: Date = new Date()): string {
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
}

export function totalSpending(budget: { categories: BudgetCategoryEntry[] }): number {
  return budget.categories.reduce((sum, c) => sum + c.amount, 0);
}

export type SpendingAnomaly = {
  category: string;
  currentAmount: number;
  averageAmount: number;
  percentChange: number; // e.g. 0.4 = 40% above average, -0.3 = 30% below
};

const ANOMALY_THRESHOLD = 0.25;

// Flags categories where the most recent month deviates >25% from the
// trailing average of prior months — a simple threshold check, not a
// statistical model, deliberately: monthly_budgets is a hand-entered
// category total, not itemized transactions, so this is the right amount of
// rigor for "unusual spending" grounding.
export function detectSpendingAnomalies(history: { categories: BudgetCategoryEntry[] }[]): SpendingAnomaly[] {
  if (history.length < 2) return [];

  const current = history[history.length - 1];
  const prior = history.slice(0, -1);

  const anomalies: SpendingAnomaly[] = [];
  for (const entry of current.categories) {
    const priorAmounts = prior
      .map((b) => b.categories.find((c) => c.category === entry.category)?.amount ?? 0)
      .filter((amount) => amount > 0);
    if (priorAmounts.length === 0) continue;

    const averageAmount = priorAmounts.reduce((sum, amount) => sum + amount, 0) / priorAmounts.length;
    if (averageAmount <= 0) continue;

    const percentChange = (entry.amount - averageAmount) / averageAmount;
    if (Math.abs(percentChange) > ANOMALY_THRESHOLD) {
      anomalies.push({ category: entry.category, currentAmount: entry.amount, averageAmount, percentChange });
    }
  }
  return anomalies;
}
