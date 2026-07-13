import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { RECOMMENDATIONS_TOOL, recommendationsPrompt } from "@/lib/prompts";
import { logWarn } from "@/lib/logger";
import { getNetWorthSummary, getEmergencyFundProgress, getRetirementProgress } from "@/lib/netWorth";
import { listGoals } from "@/lib/financialGoals";
import { listBills, withNextDueDate } from "@/lib/bills";
import { listDebts } from "@/lib/debts";
import { getFinancialProfile } from "@/lib/financialProfile";
import { getCurrentMonthBudget, totalSpending } from "@/lib/monthlyBudget";

export type Recommendation = {
  id: string;
  title: string;
  summary: string;
  category: "savings" | "debt" | "investing" | "goals" | "spending";
  priority: "high" | "medium" | "low";
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function buildRecommendationsPayload(userId: string) {
  const [netWorth, goals, bills, debts, profile, budget, emergencyFundProgress] = await Promise.all([
    getNetWorthSummary(userId),
    listGoals(),
    listBills(),
    listDebts(),
    getFinancialProfile(),
    getCurrentMonthBudget(),
    getEmergencyFundProgress()
  ]);

  const retirement = await getRetirementProgress(netWorth.investments);

  return {
    netWorth: { cash: netWorth.cash, investments: netWorth.investments, debt: netWorth.debt, netWorth: netWorth.netWorth },
    monthlyBudget: budget ? { income: budget.income, spending: totalSpending(budget) } : null,
    emergencyFundProgress,
    retirementProgress: retirement,
    goals: goals.map((g) => ({ name: g.name, targetAmount: g.targetAmount, currentAmount: g.currentAmount, targetDate: g.targetDate })),
    upcomingBills: withNextDueDate(bills)
      .slice(0, 5)
      .map((b) => ({ name: b.name, amount: b.amount, nextDueDate: b.nextDueDate })),
    debts: debts.map((d) => ({ name: d.name, balance: d.balance, interestRate: d.interestRate })),
    profile: profile
      ? { riskTolerance: profile.riskTolerance, investmentExperience: profile.investmentExperience, goals: profile.goals }
      : null
  };
}

async function generateRecommendations(userId: string): Promise<Recommendation[]> {
  if (!process.env.ANTHROPIC_API_KEY) return [];
  try {
    const payload = await buildRecommendationsPayload(userId);
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
      max_tokens: 1500,
      thinking: { type: "disabled" },
      tools: [RECOMMENDATIONS_TOOL],
      tool_choice: { type: "tool" as const, name: RECOMMENDATIONS_TOOL.name },
      messages: [{ role: "user", content: recommendationsPrompt(payload) }]
    });
    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return [];
    const input = toolUse.input as { recommendations?: Recommendation[] };
    return input.recommendations ?? [];
  } catch (error) {
    logWarn("recommendations.generate", error);
    return [];
  }
}

// Regenerated at most once per day — the unique(user_id, generated_date)
// constraint on ai_recommendations is what actually enforces that, same shape
// as portfolio_snapshots' once-per-day upsert. Unmetered against
// aiResearchCredits, same treatment as the News Feed.
export async function getOrGenerateRecommendations(userId: string): Promise<Recommendation[]> {
  const supabase = await createClient();
  const today = todayKey();

  const { data: existing } = await supabase
    .from("ai_recommendations")
    .select("recommendations")
    .eq("user_id", userId)
    .eq("generated_date", today)
    .maybeSingle();

  if (existing) {
    return (existing.recommendations as Recommendation[]) ?? [];
  }

  const recommendations = await generateRecommendations(userId);
  if (recommendations.length === 0) return [];

  const { error } = await supabase
    .from("ai_recommendations")
    .upsert(
      { user_id: userId, generated_date: today, recommendations },
      { onConflict: "user_id,generated_date" }
    );
  if (error) logWarn("recommendations.save", error);

  return recommendations;
}
