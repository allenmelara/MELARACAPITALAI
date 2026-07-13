import { money, percent } from "@/lib/finance";
import { totalSpending, type BudgetCategoryEntry } from "@/lib/budgetCalc";
import { detectSpendingAnomalies } from "@/lib/budgetCalc";
import { calculateSavingsStreak } from "@/lib/streaks";

// Pure, dependency-free (no supabase/server import) — the Financial Health
// Score is 100% deterministic math over real saved data, never AI-generated,
// so "show exactly how it was calculated" is literally true. Every category
// is either fully computed or explicitly marked unavailable — an unanswered
// category is excluded from the total (rescaled), never scored as a
// punishing 0, so a new user's score reflects only what they've provided.

export type CategoryKey =
  | "cashFlow"
  | "emergencySavings"
  | "debt"
  | "savingsConsistency"
  | "diversification"
  | "retirementProgress"
  | "insuranceReadiness"
  | "spendingStability";

export type CategoryScore = {
  key: CategoryKey;
  label: string;
  score: number;
  maxScore: number;
  available: boolean;
  explanation: string;
  howToImprove: string;
};

export type HealthScoreBreakdown = {
  overallScore: number | null;
  categories: CategoryScore[];
};

type MonthlyBudgetLike = { income: number; categories: BudgetCategoryEntry[] };

function unavailable(key: CategoryKey, label: string, maxScore: number, howToImprove: string): CategoryScore {
  return { key, label, score: 0, maxScore, available: false, explanation: "Not enough data yet.", howToImprove };
}

function scoreCashFlow(latestBudget: MonthlyBudgetLike | null): CategoryScore {
  const maxScore = 15;
  if (!latestBudget || latestBudget.income <= 0) {
    return unavailable(
      "cashFlow",
      "Cash flow",
      maxScore,
      "Log this month's income and spending on your dashboard to calculate your cash flow score."
    );
  }
  const spending = totalSpending(latestBudget);
  const savingsRate = (latestBudget.income - spending) / latestBudget.income;
  const score = Math.round(Math.min(1, Math.max(0, savingsRate) / 0.2) * maxScore * 10) / 10;
  return {
    key: "cashFlow",
    label: "Cash flow",
    score,
    maxScore,
    available: true,
    explanation: `Your most recent logged month: ${money(latestBudget.income)} income minus ${money(spending)} spending = a ${percent(savingsRate)} savings rate. A 20%+ savings rate earns full marks.`,
    howToImprove:
      savingsRate >= 0.2
        ? "You're already at or above a 20% savings rate — nice work."
        : "Spending less than you earn, and widening that gap toward a 20% savings rate, raises this score."
  };
}

function scoreEmergencySavings(progress: number | null): CategoryScore {
  const maxScore = 15;
  if (progress === null) {
    return unavailable(
      "emergencySavings",
      "Emergency savings",
      maxScore,
      "Set an emergency-fund goal in your Financial Profile and log a month's spending to calculate this."
    );
  }
  const score = Math.round(Math.min(1, Math.max(0, progress)) * maxScore * 10) / 10;
  return {
    key: "emergencySavings",
    label: "Emergency savings",
    score,
    maxScore,
    available: true,
    explanation: `Your emergency fund is at ${percent(progress)} of your target.`,
    howToImprove:
      progress >= 1
        ? "Your emergency fund is fully funded."
        : "Adding to a cash account flagged \"Emergency fund\" moves this toward your target."
  };
}

function scoreDebt(
  debts: Array<{ balance: number; minimumPayment: number | null }>,
  monthlyIncome: number | null
): CategoryScore {
  const maxScore = 15;
  if (debts.length === 0) {
    return {
      key: "debt",
      label: "Debt",
      score: maxScore,
      maxScore,
      available: true,
      explanation: "You have no tracked debts.",
      howToImprove: "Nothing to improve here — keep it up."
    };
  }
  if (!monthlyIncome || monthlyIncome <= 0) {
    return unavailable(
      "debt",
      "Debt",
      maxScore,
      "Log this month's income so we can calculate your debt-to-income ratio."
    );
  }
  const totalMinimumPayments = debts.reduce((sum, d) => sum + (d.minimumPayment ?? 0), 0);
  const dti = totalMinimumPayments / monthlyIncome;
  // DTI <=10% earns full marks, >=40% earns zero, linear between.
  const score = Math.round(Math.min(1, Math.max(0, 1 - (dti - 0.1) / 0.3)) * maxScore * 10) / 10;
  return {
    key: "debt",
    label: "Debt",
    score,
    maxScore,
    available: true,
    explanation: `Your tracked minimum debt payments (${money(totalMinimumPayments)}/mo) are ${percent(dti)} of your monthly income — a debt-to-income ratio of 10% or under earns full marks.`,
    howToImprove:
      dti <= 0.1
        ? "Your debt-to-income ratio is already healthy."
        : "Paying down balances (especially higher-interest ones first) or increasing income lowers your debt-to-income ratio."
  };
}

function scoreSavingsConsistency(budgetHistory: MonthlyBudgetLike[]): CategoryScore {
  const maxScore = 10;
  if (budgetHistory.length < 2) {
    return unavailable(
      "savingsConsistency",
      "Savings consistency",
      maxScore,
      "Log at least two months of budgets to see how consistently you're spending less than you earn."
    );
  }
  const positiveMonths = budgetHistory.filter((b) => b.income - totalSpending(b) > 0).length;
  const ratio = positiveMonths / budgetHistory.length;
  const score = Math.round(ratio * maxScore * 10) / 10;
  const streak = calculateSavingsStreak(budgetHistory);
  return {
    key: "savingsConsistency",
    label: "Savings consistency",
    score,
    maxScore,
    available: true,
    explanation: `${positiveMonths} of your last ${budgetHistory.length} logged months had income exceeding spending. Current streak: ${streak.currentMonths} month${streak.currentMonths === 1 ? "" : "s"}.`,
    howToImprove:
      ratio >= 1
        ? "Every logged month has been a positive-savings month — keep going."
        : "Aiming for a positive-savings month more often (income above spending) raises this score."
  };
}

function scoreDiversification(allocation: Array<{ percent: number }>): CategoryScore {
  const maxScore = 10;
  if (allocation.length === 0) {
    return unavailable(
      "diversification",
      "Diversification",
      maxScore,
      "Add a holding on your Portfolio Tracker to calculate this."
    );
  }
  const topHoldingPercent = Math.max(...allocation.map((a) => a.percent));
  const score = Math.round(Math.min(1, Math.max(0, (100 - topHoldingPercent) / 70)) * maxScore * 10) / 10;
  return {
    key: "diversification",
    label: "Diversification",
    score,
    maxScore,
    available: true,
    explanation: `Your largest single holding is ${topHoldingPercent.toFixed(1)}% of your tracked portfolio. 30% or less in any one holding earns full marks.`,
    howToImprove:
      topHoldingPercent <= 30
        ? "Your portfolio isn't concentrated in any single holding."
        : "Adding other holdings so no single position dominates your portfolio raises this score."
  };
}

function scoreRetirementProgress(progress: number | null): CategoryScore {
  const maxScore = 15;
  if (progress === null) {
    return unavailable(
      "retirementProgress",
      "Retirement progress",
      maxScore,
      "Complete your Financial Profile (age range and retirement age) to calculate this."
    );
  }
  const score = Math.round(Math.min(1, Math.max(0, progress)) * maxScore * 10) / 10;
  return {
    key: "retirementProgress",
    label: "Retirement progress",
    score,
    maxScore,
    available: true,
    explanation: `Your investments are at ${percent(progress)} of the estimated nest egg needed to sustain your current spending in retirement (a 4%-withdrawal-rule estimate).`,
    howToImprove:
      progress >= 1
        ? "You're at or above your estimated retirement target."
        : "Regular contributions to investments tracked in your Portfolio move this toward your target."
  };
}

function scoreInsuranceReadiness(flags: Array<boolean | null>): CategoryScore {
  const maxScore = 10;
  const answered = flags.filter((f) => f !== null) as boolean[];
  if (answered.length === 0) {
    return unavailable(
      "insuranceReadiness",
      "Insurance readiness",
      maxScore,
      "Answer a few quick questions about your insurance coverage on the Financial Health page to calculate this."
    );
  }
  const trueCount = answered.filter(Boolean).length;
  const score = Math.round((trueCount / answered.length) * maxScore * 10) / 10;
  return {
    key: "insuranceReadiness",
    label: "Insurance readiness",
    score,
    maxScore,
    available: true,
    explanation: `You've told us you have ${trueCount} of ${answered.length} answered types of coverage in place.`,
    howToImprove:
      trueCount === answered.length
        ? "You've indicated coverage across everything you've answered."
        : "Consider whether the coverage gaps you've flagged (health, life, disability, home/renters) make sense for your situation."
  };
}

function scoreSpendingStability(budgetHistory: MonthlyBudgetLike[]): CategoryScore {
  const maxScore = 10;
  if (budgetHistory.length < 2) {
    return unavailable(
      "spendingStability",
      "Spending stability",
      maxScore,
      "Log at least two months of budgets to see how stable your spending is category to category."
    );
  }
  const anomalies = detectSpendingAnomalies(budgetHistory);
  const score = Math.max(0, maxScore - 2 * anomalies.length);
  return {
    key: "spendingStability",
    label: "Spending stability",
    score,
    maxScore,
    available: true,
    explanation:
      anomalies.length === 0
        ? "None of your spending categories are more than 25% off their trailing average this month."
        : `${anomalies.length} categor${anomalies.length === 1 ? "y is" : "ies are"} more than 25% off their trailing average this month: ${anomalies.map((a) => a.category).join(", ")}.`,
    howToImprove:
      anomalies.length === 0
        ? "Your spending has been steady month to month."
        : "Bringing flagged categories back toward their usual monthly amount raises this score."
  };
}

export function calculateHealthScore(inputs: {
  latestBudget: MonthlyBudgetLike | null;
  budgetHistory: MonthlyBudgetLike[];
  emergencyFundProgress: number | null;
  retirementProgress: number | null;
  debts: Array<{ balance: number; minimumPayment: number | null }>;
  monthlyIncome: number | null;
  investmentAllocation: Array<{ percent: number }>;
  insuranceFlags: Array<boolean | null>;
}): HealthScoreBreakdown {
  const categories: CategoryScore[] = [
    scoreCashFlow(inputs.latestBudget),
    scoreEmergencySavings(inputs.emergencyFundProgress),
    scoreDebt(inputs.debts, inputs.monthlyIncome),
    scoreSavingsConsistency(inputs.budgetHistory),
    scoreDiversification(inputs.investmentAllocation),
    scoreRetirementProgress(inputs.retirementProgress),
    scoreInsuranceReadiness(inputs.insuranceFlags),
    scoreSpendingStability(inputs.budgetHistory)
  ];

  const available = categories.filter((c) => c.available);
  const overallScore =
    available.length > 0
      ? Math.round(
          (available.reduce((sum, c) => sum + c.score, 0) / available.reduce((sum, c) => sum + c.maxScore, 0)) * 100
        )
      : null;

  return { overallScore, categories };
}
