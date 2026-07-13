import type { FinancialGoal } from "@/lib/financialGoals";

// Pure calculator, deliberately dependency-free (no supabase/server import)
// so client components (GoalProjectionChart) can import it directly without
// pulling a server-only module into the browser bundle — see
// lib/financialGoals.ts for the CRUD half of this feature.

export type GoalProjectionPoint = { date: string; amount: number };

export function calculateGoalProjection(goal: FinancialGoal): {
  series: GoalProjectionPoint[];
  requiredMonthlyContribution: number | null;
} {
  if (!goal.targetDate) {
    return { series: [], requiredMonthlyContribution: null };
  }

  const today = new Date();
  const target = new Date(goal.targetDate);
  const monthsRemaining = Math.max(
    1,
    (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth())
  );

  const remaining = goal.targetAmount - goal.currentAmount;
  const requiredMonthlyContribution = remaining > 0 ? remaining / monthsRemaining : 0;

  const series: GoalProjectionPoint[] = [];
  for (let month = 0; month <= monthsRemaining; month++) {
    const date = new Date(today.getFullYear(), today.getMonth() + month, 1);
    const amount = Math.min(goal.targetAmount, goal.currentAmount + requiredMonthlyContribution * month);
    series.push({ date: date.toISOString().slice(0, 10), amount });
  }

  return { series, requiredMonthlyContribution };
}
