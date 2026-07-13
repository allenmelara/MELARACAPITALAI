import { createClient } from "@/lib/supabase/server";

export type GoalCategory =
  | "emergency_fund"
  | "retirement"
  | "home"
  | "debt_payoff"
  | "education"
  | "business"
  | "general";

export type FinancialGoal = {
  id: string;
  name: string;
  category: GoalCategory | null;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  createdAt: string;
};

export async function listGoals(): Promise<FinancialGoal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_goals")
    .select("id, name, category, target_amount, current_amount, target_date, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    category: g.category,
    targetAmount: Number(g.target_amount),
    currentAmount: Number(g.current_amount),
    targetDate: g.target_date,
    createdAt: g.created_at
  }));
}

export async function addGoal(
  userId: string,
  params: { name: string; category?: GoalCategory; targetAmount: number; currentAmount?: number; targetDate?: string }
): Promise<FinancialGoal> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_goals")
    .insert({
      user_id: userId,
      name: params.name,
      category: params.category ?? null,
      target_amount: params.targetAmount,
      current_amount: params.currentAmount ?? 0,
      target_date: params.targetDate ?? null
    })
    .select("id, name, category, target_amount, current_amount, target_date, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    category: data.category,
    targetAmount: Number(data.target_amount),
    currentAmount: Number(data.current_amount),
    targetDate: data.target_date,
    createdAt: data.created_at
  };
}

export async function updateGoalProgress(id: string, currentAmount: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_goals")
    .update({ current_amount: currentAmount, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("financial_goals").delete().eq("id", id);
  if (error) throw error;
}

// The pure calculateGoalProjection calculator lives in lib/goalCalc.ts, split
// out so client components can import it without pulling this file's
// supabase/server (next/headers) dependency into the browser bundle.
export { calculateGoalProjection, type GoalProjectionPoint } from "@/lib/goalCalc";
