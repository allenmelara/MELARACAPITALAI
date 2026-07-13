import { createClient } from "@/lib/supabase/server";
import { currentMonthKey, type BudgetCategoryEntry } from "@/lib/budgetCalc";

// Re-exported for convenience — server-only consumers (API routes) can keep
// importing everything from this one module; client components must import
// the pure helpers from lib/budgetCalc.ts directly instead (see that file's
// header comment for why).
export { BUDGET_CATEGORIES, currentMonthKey, totalSpending, type BudgetCategoryEntry } from "@/lib/budgetCalc";

export type MonthlyBudget = {
  month: string; // first-of-month date, e.g. "2026-07-01"
  income: number;
  categories: BudgetCategoryEntry[];
  updatedAt: string;
};

function toMonthlyBudget(row: {
  month: string;
  income: number | string;
  categories: BudgetCategoryEntry[] | null;
  updated_at: string;
}): MonthlyBudget {
  return {
    month: row.month,
    income: Number(row.income),
    categories: row.categories ?? [],
    updatedAt: row.updated_at
  };
}

export async function getCurrentMonthBudget(): Promise<MonthlyBudget | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monthly_budgets")
    .select("month, income, categories, updated_at")
    .eq("month", currentMonthKey())
    .maybeSingle();
  if (error) throw error;
  return data ? toMonthlyBudget(data) : null;
}

export async function upsertMonthBudget(
  userId: string,
  params: { month: string; income: number; categories: BudgetCategoryEntry[] }
): Promise<MonthlyBudget> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monthly_budgets")
    .upsert(
      {
        user_id: userId,
        month: params.month,
        income: params.income,
        categories: params.categories,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,month" }
    )
    .select("month, income, categories, updated_at")
    .single();
  if (error) throw error;
  return toMonthlyBudget(data);
}

export async function getBudgetHistory(months = 12): Promise<MonthlyBudget[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monthly_budgets")
    .select("month, income, categories, updated_at")
    .order("month", { ascending: true })
    .limit(months);
  if (error) throw error;
  return (data ?? []).map(toMonthlyBudget);
}
