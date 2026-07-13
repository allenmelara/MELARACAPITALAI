import { getNetWorthSummary, getEmergencyFundProgress, getRetirementProgress } from "@/lib/netWorth";
import { getFinancialProfile } from "@/lib/financialProfile";
import { listGoals } from "@/lib/financialGoals";
import { calculateGoalProjection } from "@/lib/goalCalc";
import { listDebts } from "@/lib/debts";
import { calculateDebtPayoff } from "@/lib/debtCalc";
import { getBudgetHistory, getCurrentMonthBudget, totalSpending } from "@/lib/monthlyBudget";
import { detectSpendingAnomalies } from "@/lib/budgetCalc";
import { listBills, withNextDueDate } from "@/lib/bills";
import { simulateSavingsGrowth, compareDebtPayoffVsInvesting, monthsToPayoff } from "@/lib/scenarioCalc";

// Server-only functions backing the AI coach's tools (app/api/assistant/chat/route.ts
// runTool + lib/prompts.ts ASSISTANT_TOOLS). Each wraps existing Phase 1/2 reads —
// no new queries duplicated — and returns a slimmed, AI-friendly shape.

export async function getFinancialOverview(userId: string) {
  const [netWorth, profile, goals, debts] = await Promise.all([
    getNetWorthSummary(userId),
    getFinancialProfile(),
    listGoals(),
    listDebts()
  ]);
  const [emergencyFundProgress, retirementProgress] = await Promise.all([
    getEmergencyFundProgress(),
    getRetirementProgress(netWorth.investments)
  ]);

  return {
    netWorth: {
      cash: netWorth.cash,
      investments: netWorth.investments,
      realEstateEquity: netWorth.realEstateEquity,
      debt: netWorth.debt,
      netWorth: netWorth.netWorth
    },
    emergencyFundProgress,
    retirementProgress,
    // financial_profiles fields are coarse self-reported ranges, not exact
    // figures — labeled here so the model doesn't cite them as precise numbers.
    profileRanges: profile
      ? {
          ageRange: profile.ageRange,
          incomeRange: profile.incomeRange,
          monthlyExpensesRange: profile.monthlyExpensesRange,
          savingsRange: profile.savingsRange,
          debtsRange: profile.debtsRange,
          riskTolerance: profile.riskTolerance,
          investmentExperience: profile.investmentExperience,
          statedGoalInterests: profile.goals,
          emergencyFundGoalMonths: profile.emergencyFundGoalMonths,
          retirementGoalAge: profile.retirementGoalAge
        }
      : null,
    goalCount: goals.length,
    totalGoalTargetAmount: goals.reduce((sum, g) => sum + g.targetAmount, 0),
    totalGoalCurrentAmount: goals.reduce((sum, g) => sum + g.currentAmount, 0),
    debtCount: debts.length,
    totalDebtBalance: debts.reduce((sum, d) => sum + d.balance, 0)
  };
}

export async function getGoalsForCoach() {
  const goals = await listGoals();
  return goals.map((g) => {
    const projection = calculateGoalProjection(g);
    return {
      name: g.name,
      category: g.category,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      targetDate: g.targetDate,
      progressPercent: g.targetAmount > 0 ? Math.min(1, g.currentAmount / g.targetAmount) : 0,
      requiredMonthlyContribution: projection.requiredMonthlyContribution
    };
  });
}

export async function getDebtsForCoach() {
  const debts = await listDebts();
  return debts.map((d) => ({
    name: d.name,
    debtType: d.debtType,
    balance: d.balance,
    interestRate: d.interestRate,
    minimumPayment: d.minimumPayment
  }));
}

export async function getSpendingHistoryForCoach() {
  const history = await getBudgetHistory(6);
  return {
    months: history.map((b) => ({
      month: b.month,
      income: b.income,
      totalSpending: totalSpending(b),
      categories: b.categories
    })),
    unusualSpending: detectSpendingAnomalies(history)
  };
}

export async function getPeriodSummary(userId: string, period: "week" | "month") {
  const days = period === "week" ? 7 : 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffKey = cutoffDate.toISOString().slice(0, 10);

  const [netWorth, currentBudget, budgetHistory, goals, bills] = await Promise.all([
    getNetWorthSummary(userId),
    getCurrentMonthBudget(),
    getBudgetHistory(2),
    listGoals(),
    listBills()
  ]);

  const pastSnapshot = [...netWorth.history].reverse().find((p) => p.date <= cutoffKey) ?? null;
  const previousBudget = budgetHistory.length >= 2 ? budgetHistory[budgetHistory.length - 2] : null;

  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + days);
  const upcomingBillsInPeriod = withNextDueDate(bills)
    .filter((b) => new Date(b.nextDueDate) <= windowEnd)
    .map((b) => ({ name: b.name, amount: b.amount, dueDate: b.nextDueDate }));

  return {
    period,
    netWorth: {
      current: netWorth.netWorth,
      periodStartDate: pastSnapshot?.date ?? null,
      changeSincePeriodStart: pastSnapshot ? netWorth.netWorth - pastSnapshot.netWorth : null
    },
    spending:
      period === "month"
        ? {
            currentMonth: currentBudget ? totalSpending(currentBudget) : null,
            previousMonth: previousBudget ? totalSpending(previousBudget) : null,
            change:
              currentBudget && previousBudget ? totalSpending(currentBudget) - totalSpending(previousBudget) : null
          }
        : { note: "Spending is tracked monthly, not weekly — no week-over-week comparison available." },
    goals: goals.map((g) => ({
      name: g.name,
      progressPercent: g.targetAmount > 0 ? Math.min(1, g.currentAmount / g.targetAmount) : 0
    })),
    upcomingBillsInPeriod
  };
}

export async function simulateExtraSavingsForCoach(extraMonthlyAmount: number, months = 12) {
  return simulateSavingsGrowth({ extraMonthlyAmount, months });
}

export async function simulateDebtPayoffForCoach(extraMonthlyPayment = 0) {
  const debts = await listDebts();
  if (debts.length === 0) {
    return { error: "No debts tracked yet — add one on the Accounts page to simulate a payoff." };
  }

  const baseline = calculateDebtPayoff(debts, 0);
  const withExtra = calculateDebtPayoff(debts, extraMonthlyPayment);
  const baselineMonths = monthsToPayoff(debts, baseline.payoffMonths);
  const acceleratedMonths = monthsToPayoff(debts, withExtra.payoffMonths);

  return {
    debts: debts.map((d) => ({ name: d.name, balance: d.balance, interestRate: d.interestRate })),
    extraMonthlyPayment,
    baselineMonthsToPayoff: baselineMonths,
    acceleratedMonthsToPayoff: acceleratedMonths,
    monthsSaved: baselineMonths !== null && acceleratedMonths !== null ? baselineMonths - acceleratedMonths : null,
    interestSaved: baseline.totalInterestPaid - withExtra.totalInterestPaid
  };
}

export async function compareDebtVsInvestingForCoach(extraMonthlyAmount: number) {
  const debts = await listDebts();
  if (debts.length === 0) {
    return { error: "No debts tracked yet — add one on the Accounts page to run this comparison." };
  }
  return compareDebtPayoffVsInvesting({ debts, extraMonthlyAmount });
}
