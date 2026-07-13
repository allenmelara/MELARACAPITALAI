import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getHealthScoreForUser } from "@/lib/healthScore";
import { getBudgetHistory } from "@/lib/monthlyBudget";
import { getFinancialProfile } from "@/lib/financialProfile";
import { calculateSavingsStreak, calculateInvestmentConsistencyStreak } from "@/lib/streaks";
import HealthScoreChart from "@/components/dashboard/HealthScoreChart";
import HealthScoreBreakdown from "@/components/HealthScoreBreakdown";
import InsuranceFlagsForm from "@/components/InsuranceFlagsForm";

export default async function HealthPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const [healthScore, budgetHistory, financialProfile] = await Promise.all([
    getHealthScoreForUser(user.id),
    getBudgetHistory(6),
    getFinancialProfile()
  ]);

  const savingsStreak = calculateSavingsStreak(budgetHistory);
  const investmentStreak = calculateInvestmentConsistencyStreak(budgetHistory);

  return (
    <>
      <section className="dash-header">
        <h1>Financial Health</h1>
        <p>
          A transparent 0-100 score built from your real saved data — every category below shows exactly how
          it's calculated and how to improve it.
        </p>
      </section>

      <div className="panel health-score-overall">
        <div>
          <span className="health-score-number">{healthScore.overallScore ?? "—"}</span>
          <span className="health-score-max"> / 100</span>
        </div>
        <p className="disclaimer" style={{ marginBottom: 0 }}>
          {healthScore.overallScore === null
            ? "Add some data below to calculate your first score — even one category is enough to get started."
            : `Based on ${healthScore.categories.filter((c) => c.available).length} of ${healthScore.categories.length} categories you have data for.`}
        </p>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>Score history</h2>
        <HealthScoreChart history={healthScore.history} />
      </div>

      <h2 className="health-score-section-heading">Category breakdown</h2>
      <HealthScoreBreakdown categories={healthScore.categories} />

      <div className="dash-columns" style={{ marginTop: 20 }}>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Savings streak</h3>
          <p className="disclaimer" style={{ marginBottom: 0 }}>
            {savingsStreak.currentMonths} month{savingsStreak.currentMonths === 1 ? "" : "s"} in a row with income
            above spending (longest: {savingsStreak.longestMonths}).
          </p>
        </div>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Investment consistency streak</h3>
          <p className="disclaimer" style={{ marginBottom: 0 }}>
            {investmentStreak.currentMonths} month{investmentStreak.currentMonths === 1 ? "" : "s"} in a row
            logging money toward savings/investments (longest: {investmentStreak.longestMonths}).
          </p>
        </div>
      </div>

      <InsuranceFlagsForm
        initial={{
          hasHealthInsurance: financialProfile?.hasHealthInsurance ?? null,
          hasLifeInsurance: financialProfile?.hasLifeInsurance ?? null,
          hasDisabilityInsurance: financialProfile?.hasDisabilityInsurance ?? null,
          hasHomeOrRentersInsurance: financialProfile?.hasHomeOrRentersInsurance ?? null
        }}
      />
    </>
  );
}
