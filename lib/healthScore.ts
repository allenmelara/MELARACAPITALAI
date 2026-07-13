import { createClient } from "@/lib/supabase/server";
import { logWarn } from "@/lib/logger";
import { calculateHealthScore, type HealthScoreBreakdown } from "@/lib/healthScoreCalc";
import { getEmergencyFundProgress, getRetirementProgress } from "@/lib/netWorth";
import { getPortfolioSummary } from "@/lib/portfolio";
import { listDebts } from "@/lib/debts";
import { getCurrentMonthBudget, getBudgetHistory } from "@/lib/monthlyBudget";
import { getFinancialProfile } from "@/lib/financialProfile";

export type HealthScoreHistoryPoint = { date: string; score: number | null };

async function recordHealthScoreSnapshot(
  userId: string,
  overallScore: number | null,
  categoryScores: HealthScoreBreakdown["categories"]
): Promise<void> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("health_score_snapshots").upsert(
    { user_id: userId, snapshot_date: today, overall_score: overallScore, category_scores: categoryScores },
    { onConflict: "user_id,snapshot_date" }
  );
  if (error) logWarn("healthScore.snapshot", error);
}

async function getHealthScoreHistory(): Promise<HealthScoreHistoryPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("health_score_snapshots")
    .select("snapshot_date, overall_score")
    .order("snapshot_date", { ascending: true })
    .limit(365);
  if (error) {
    logWarn("healthScore.history", error);
    return [];
  }
  return (data ?? []).map((d) => ({
    date: d.snapshot_date,
    score: d.overall_score !== null ? Number(d.overall_score) : null
  }));
}

// Same on-page-load upsert-then-read trigger as lib/netWorth.ts's
// net_worth_snapshots — no cron required for this to accumulate history,
// though the daily cron (Part G) also calls this so users who don't visit
// still get a snapshot recorded.
export async function getHealthScoreForUser(
  userId: string
): Promise<HealthScoreBreakdown & { history: HealthScoreHistoryPoint[] }> {
  const [portfolio, debts, currentBudget, budgetHistory, profile] = await Promise.all([
    getPortfolioSummary(userId),
    listDebts(),
    getCurrentMonthBudget(),
    getBudgetHistory(6),
    getFinancialProfile()
  ]);

  const [emergencyFundProgress, retirementProgress] = await Promise.all([
    getEmergencyFundProgress(),
    getRetirementProgress(portfolio.totalValue)
  ]);

  const breakdown = calculateHealthScore({
    latestBudget: currentBudget,
    budgetHistory,
    emergencyFundProgress: emergencyFundProgress?.progress ?? null,
    retirementProgress: retirementProgress?.progress ?? null,
    debts: debts.map((d) => ({ balance: d.balance, minimumPayment: d.minimumPayment })),
    monthlyIncome: currentBudget?.income ?? null,
    investmentAllocation: portfolio.allocation,
    insuranceFlags: profile
      ? [
          profile.hasHealthInsurance,
          profile.hasLifeInsurance,
          profile.hasDisabilityInsurance,
          profile.hasHomeOrRentersInsurance
        ]
      : [null, null, null, null]
  });

  await recordHealthScoreSnapshot(userId, breakdown.overallScore, breakdown.categories);
  const history = await getHealthScoreHistory();

  return { ...breakdown, history };
}
