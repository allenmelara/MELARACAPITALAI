import { money, percent } from "@/lib/finance";
import type { CategoryKey, CategoryScore } from "@/lib/healthScoreCalc";
import type { SpendingAnomaly } from "@/lib/budgetCalc";
import type { Streak } from "@/lib/streaks";

// Pure, dependency-free, rule-based — no AI call, no persistence, no cost.
// Computed fresh every load from the health-score breakdown, streaks, and
// spending data; dismissal is handled client-side (localStorage), same
// pattern as components/OnboardingNudge.tsx. Deliberately quiet: at most 3
// items, no urgency language, no streak-loss framing, no comparison to
// other users.

export type Mission = {
  id: string;
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
};

const CATEGORY_CTA: Record<CategoryKey, { href: string; label: string }> = {
  cashFlow: { href: "/dashboard#monthly-budget", label: "Log this month's budget" },
  emergencySavings: { href: "/dashboard/accounts", label: "Add a cash account" },
  debt: { href: "/dashboard/accounts", label: "Review your debts" },
  savingsConsistency: { href: "/dashboard#monthly-budget", label: "Log this month's budget" },
  diversification: { href: "/dashboard/portfolio", label: "Add a holding" },
  retirementProgress: { href: "/dashboard/onboarding", label: "Complete your profile" },
  insuranceReadiness: { href: "/dashboard/health", label: "Answer insurance questions" },
  spendingStability: { href: "/dashboard#monthly-budget", label: "Review this month's spending" }
};

const MAX_MISSIONS = 3;

export function generateMissions(input: {
  categories: CategoryScore[];
  savingsStreak: Streak;
  spendingAnomalies: SpendingAnomaly[];
}): Mission[] {
  const missions: Mission[] = [];

  // 1. Available categories scoring under half — biggest real gaps first.
  const underperforming = input.categories
    .filter((c) => c.available && c.score < c.maxScore * 0.5)
    .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore);
  for (const category of underperforming) {
    const cta = CATEGORY_CTA[category.key];
    missions.push({
      id: `improve-${category.key}`,
      title: `Improve your ${category.label.toLowerCase()} score`,
      description: category.howToImprove,
      ctaHref: cta.href,
      ctaLabel: cta.label
    });
  }

  // 2. Unavailable categories — quick setup nudges, lower priority than a
  // real known gap but still useful for a mostly-empty profile.
  const unavailable = input.categories.filter((c) => !c.available);
  for (const category of unavailable) {
    const cta = CATEGORY_CTA[category.key];
    missions.push({
      id: `setup-${category.key}`,
      title: `Add data for ${category.label.toLowerCase()}`,
      description: category.howToImprove,
      ctaHref: cta.href,
      ctaLabel: cta.label
    });
  }

  // 3. A budget challenge from the single most unusual spending category.
  if (input.spendingAnomalies.length > 0) {
    const worst = [...input.spendingAnomalies].sort(
      (a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange)
    )[0];
    const direction = worst.percentChange > 0 ? "above" : "below";
    missions.push({
      id: `budget-challenge-${worst.category}`,
      title: `Budget challenge: ${worst.category}`,
      description: `${worst.category} was ${money(worst.currentAmount)} this month, ${percent(Math.abs(worst.percentChange))} ${direction} your usual ${money(worst.averageAmount)}. See if next month can land closer to average.`,
      ctaHref: CATEGORY_CTA.spendingStability.href,
      ctaLabel: CATEGORY_CTA.spendingStability.label
    });
  }

  return missions.slice(0, MAX_MISSIONS);
}
