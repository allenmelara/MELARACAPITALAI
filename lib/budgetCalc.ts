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
