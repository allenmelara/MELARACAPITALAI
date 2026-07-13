import { createClient } from "@/lib/supabase/server";
import { logWarn } from "@/lib/logger";
import { getTotalCash } from "@/lib/cashAccounts";
import { getTotalDebt } from "@/lib/debts";
import { getTotalRealEstateEquity } from "@/lib/realEstateHoldings";
import { getPortfolioSummary, type PortfolioSummary } from "@/lib/portfolio";
import { getFinancialProfile, type AgeRange, type IncomeRange, type ExpensesRange } from "@/lib/financialProfile";
import { getCurrentMonthBudget, totalSpending } from "@/lib/monthlyBudget";
import { calculateWealthMetrics } from "@/lib/wealth";

export type NetWorthHistoryPoint = { date: string; netWorth: number; totalAssets: number; totalDebt: number };

export type NetWorthSummary = {
  cash: number;
  investments: number;
  realEstateEquity: number;
  totalAssets: number;
  debt: number;
  netWorth: number;
  history: NetWorthHistoryPoint[];
  investmentAllocation: PortfolioSummary["allocation"];
};

async function recordNetWorthSnapshot(userId: string, netWorth: number, totalAssets: number, totalDebt: number): Promise<void> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("net_worth_snapshots").upsert(
    { user_id: userId, snapshot_date: today, net_worth: netWorth, total_assets: totalAssets, total_debt: totalDebt },
    { onConflict: "user_id,snapshot_date" }
  );
  if (error) logWarn("netWorth.snapshot", error);
}

async function getNetWorthHistory(): Promise<NetWorthHistoryPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("net_worth_snapshots")
    .select("snapshot_date, net_worth, total_assets, total_debt")
    .order("snapshot_date", { ascending: true })
    .limit(365);
  if (error) {
    logWarn("netWorth.history", error);
    return [];
  }
  return (data ?? []).map((d) => ({
    date: d.snapshot_date,
    netWorth: Number(d.net_worth),
    totalAssets: Number(d.total_assets),
    totalDebt: Number(d.total_debt)
  }));
}

// Same on-page-load upsert-then-read trigger as lib/portfolio.ts's
// portfolio_snapshots — no cron, history accumulates from today onward.
export async function getNetWorthSummary(userId: string): Promise<NetWorthSummary> {
  const [cashResult, portfolio, realEstateEquity, debt] = await Promise.all([
    getTotalCash(),
    getPortfolioSummary(userId),
    getTotalRealEstateEquity(),
    getTotalDebt()
  ]);

  const cash = cashResult.total;
  const investments = portfolio.totalValue;
  const totalAssets = cash + investments + realEstateEquity;
  const netWorth = totalAssets - debt;

  await recordNetWorthSnapshot(userId, netWorth, totalAssets, debt);
  const history = await getNetWorthHistory();

  return {
    cash,
    investments,
    realEstateEquity,
    totalAssets,
    debt,
    netWorth,
    history,
    investmentAllocation: portfolio.allocation
  };
}

export type EmergencyFundProgress = { progress: number; target: number; current: number };

// null means there isn't enough data yet (no goal set, or no budget logged)
// to compute a meaningful target — the UI shows a CTA instead of a bar.
export async function getEmergencyFundProgress(): Promise<EmergencyFundProgress | null> {
  const profile = await getFinancialProfile();
  const months = profile?.emergencyFundGoalMonths;
  if (!months) return null;

  const budget = await getCurrentMonthBudget();
  const monthlySpending = budget ? totalSpending(budget) : 0;
  if (!monthlySpending) return null;

  const { emergencyFund } = await getTotalCash();
  const target = monthlySpending * months;
  return { progress: target > 0 ? Math.min(1, emergencyFund / target) : 0, target, current: emergencyFund };
}

const AGE_MIDPOINT: Record<AgeRange, number> = {
  under_25: 22,
  "25_34": 30,
  "35_44": 40,
  "45_54": 50,
  "55_64": 60,
  "65_plus": 68
};

const INCOME_MIDPOINT: Record<IncomeRange, number> = {
  under_50k: 40_000,
  "50k_100k": 75_000,
  "100k_150k": 125_000,
  "150k_250k": 200_000,
  "250k_plus": 300_000
};

const EXPENSES_MIDPOINT: Record<ExpensesRange, number> = {
  under_2k: 1500,
  "2k_4k": 3000,
  "4k_6k": 5000,
  "6k_10k": 8000,
  "10k_plus": 12_000
};

export type RetirementProgress = {
  progress: number;
  target: number; // "today's dollars" nest egg needed (4%-rule), used for the progress ratio
  current: number;
  projectedBalanceAtRetirement: number | null; // supplementary, from calculateWealthMetrics
  isEstimate: boolean; // true whenever any input is a coarse financial_profiles range rather than real data
};

// Educational approximation, clearly labeled as such — leans on financial_profiles
// range midpoints when real income/expense data isn't available. Target is the
// 4%-rule nest egg needed to sustain today's expenses (not a future projected
// balance), so "progress" is interpretable as a percentage of that.
export async function getRetirementProgress(investments: number): Promise<RetirementProgress | null> {
  const profile = await getFinancialProfile();
  if (!profile?.ageRange) return null;

  const currentAge = AGE_MIDPOINT[profile.ageRange];
  const retirementAge = profile.retirementGoalAge ?? 65;
  const yearsToRetirement = Math.max(1, retirementAge - currentAge);

  const budget = await getCurrentMonthBudget();
  const isEstimate = !budget || !profile.incomeRange || !profile.monthlyExpensesRange;

  const monthlyIncome = budget?.income || (profile.incomeRange ? INCOME_MIDPOINT[profile.incomeRange] / 12 : 0);
  const monthlyExpenses = budget
    ? totalSpending(budget)
    : profile.monthlyExpensesRange
      ? EXPENSES_MIDPOINT[profile.monthlyExpensesRange]
      : monthlyIncome * 0.7;

  const withdrawalRate = 0.04;
  const target = (monthlyExpenses * 12) / withdrawalRate;

  const monthlyRetirementContribution = Math.max(0, monthlyIncome - monthlyExpenses) * 0.5;
  const metrics = calculateWealthMetrics({
    monthlyIncome,
    monthlyExpenses,
    currentAssets: investments,
    currentLiabilities: 0,
    currentRetirementSavings: investments,
    monthlyRetirementContribution,
    expectedAnnualReturn: 0.07,
    yearsToRetirement,
    emergencyFundMonths: profile.emergencyFundGoalMonths ?? 6,
    withdrawalRate
  });

  return {
    progress: target > 0 ? Math.min(1, investments / target) : 0,
    target,
    current: investments,
    projectedBalanceAtRetirement: metrics.retirementBalance,
    isEstimate
  };
}
