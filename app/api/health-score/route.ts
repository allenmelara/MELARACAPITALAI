import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getHealthScoreForUser } from "@/lib/healthScore";
import { getBudgetHistory } from "@/lib/monthlyBudget";
import { calculateSavingsStreak } from "@/lib/streaks";
import { detectSpendingAnomalies } from "@/lib/budgetCalc";
import { generateMissions } from "@/lib/missions";
import { listGoals } from "@/lib/financialGoals";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

// Dashboard-summary endpoint: score + missions + goal progress + streak in
// one round trip, so the self-fetching dashboard widgets (score tile,
// missions list, celebration banner) — none of which can block the main SSR
// page, since getHealthScoreForUser touches the same Finnhub-backed
// portfolio read the dashboard's net worth section already does — only pay
// that cost once between them, instead of each fetching separately.
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const [healthScore, budgetHistory, goals] = await Promise.all([
      getHealthScoreForUser(user.id),
      getBudgetHistory(6),
      listGoals()
    ]);
    const savingsStreak = calculateSavingsStreak(budgetHistory);
    const spendingAnomalies = detectSpendingAnomalies(budgetHistory);
    const missions = generateMissions({ categories: healthScore.categories, savingsStreak, spendingAnomalies });

    return NextResponse.json({
      overallScore: healthScore.overallScore,
      history: healthScore.history,
      missions,
      savingsStreak,
      goals: goals.map((g) => ({
        id: g.id,
        name: g.name,
        progressPercent: g.targetAmount > 0 ? Math.min(1, g.currentAmount / g.targetAmount) : 0
      }))
    });
  } catch (error) {
    logError("healthScore.summary", error);
    return NextResponse.json({ error: "Failed to load your financial health score." }, { status: 500 });
  }
}
