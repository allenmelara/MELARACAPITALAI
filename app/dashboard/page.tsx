import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, FileText, Home, PiggyBank } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { listReports } from "@/lib/reports";
import { listRecentChatReports } from "@/lib/reportChat";
import { getMarketSnapshot } from "@/lib/marketData";
import { getFinancialProfile } from "@/lib/financialProfile";
import { listCashAccounts } from "@/lib/cashAccounts";
import { listDebts } from "@/lib/debts";
import { listRealEstateHoldings } from "@/lib/realEstateHoldings";
import { listBills, withNextDueDate } from "@/lib/bills";
import { listGoals } from "@/lib/financialGoals";
import { getWatchlistWithQuotes } from "@/lib/watchlist";
import { listHoldings } from "@/lib/portfolio";
import { getCurrentMonthBudget, getBudgetHistory } from "@/lib/monthlyBudget";
import { getNetWorthSummary, getEmergencyFundProgress, getRetirementProgress } from "@/lib/netWorth";
import MarketDashboard from "@/components/MarketDashboard";
import OnboardingNudge from "@/components/OnboardingNudge";
import NetWorthSummary from "@/components/dashboard/NetWorthSummary";
import ProgressTile from "@/components/dashboard/ProgressTile";
import MonthlyBudgetSection from "@/components/dashboard/MonthlyBudgetSection";
import UpcomingBills from "@/components/dashboard/UpcomingBills";
import GoalsSummary from "@/components/dashboard/GoalsSummary";
import WatchlistSummary from "@/components/dashboard/WatchlistSummary";
import NetWorthChart from "@/components/dashboard/NetWorthChart";
import IncomeSpendingChart from "@/components/dashboard/IncomeSpendingChart";
import SpendingCategoryChart from "@/components/dashboard/SpendingCategoryChart";
import SavingsProgressChart from "@/components/dashboard/SavingsProgressChart";
import DebtPayoffChart from "@/components/dashboard/DebtPayoffChart";
import InvestmentAllocationChart from "@/components/dashboard/InvestmentAllocationChart";
import GoalProjectionChart from "@/components/dashboard/GoalProjectionChart";
import RecommendationsCard from "@/components/dashboard/RecommendationsCard";

const MODULE_LABELS: Record<string, string> = {
  company: "Company Research",
  document: "Document Analysis",
  real_estate: "Real Estate",
  wealth: "Wealth Planner"
};

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ passwordUpdated?: string }>;
}) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const [
    reports,
    recentChats,
    params,
    marketSnapshot,
    financialProfile,
    cashAccounts,
    debts,
    realEstateHoldings,
    bills,
    goals,
    watchlist,
    holdings,
    budgetHistory,
    currentBudget,
    netWorth
  ] = await Promise.all([
    listReports(),
    listRecentChatReports(5),
    searchParams,
    getMarketSnapshot(),
    getFinancialProfile(),
    listCashAccounts(),
    listDebts(),
    listRealEstateHoldings(),
    listBills(),
    listGoals(),
    getWatchlistWithQuotes(),
    listHoldings(),
    getBudgetHistory(),
    getCurrentMonthBudget(),
    getNetWorthSummary(user.id)
  ]);

  const previousBudget = budgetHistory.length > 0 ? budgetHistory[budgetHistory.length - 1] : null;
  const [emergencyFundProgress, retirementProgress] = await Promise.all([
    getEmergencyFundProgress(),
    getRetirementProgress(netWorth.investments)
  ]);

  const recentReports = reports.slice(0, 5);
  const recentDocuments = reports.filter((r) => r.module === "document").slice(0, 5);
  const firstName = user?.email ? user.email.split("@")[0] : "";
  const showOnboardingNudge = !financialProfile?.onboardingCompletedAt && !financialProfile?.onboardingSkipped;
  const upcomingBills = withNextDueDate(bills);

  return (
    <>
      <section className="dash-header">
        <h1>Welcome back{firstName ? `, ${firstName}` : ""}.</h1>
        <p>Continue where you left off, or start something new.</p>
        {params.passwordUpdated === "1" && <p className="notice">Your password has been updated.</p>}
      </section>

      <OnboardingNudge eligible={showOnboardingNudge} />

      <NetWorthSummary
        netWorth={netWorth}
        hasCash={cashAccounts.length > 0}
        hasDebt={debts.length > 0}
        hasInvestments={holdings.length > 0}
        hasRealEstate={realEstateHoldings.length > 0}
        currentBudget={currentBudget}
      />

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Net worth history</h3>
        <NetWorthChart history={netWorth.history} />
      </div>

      <RecommendationsCard />

      <div className="dash-columns" style={{ marginBottom: 20 }}>
        <ProgressTile
          title="Emergency fund progress"
          progress={emergencyFundProgress?.progress ?? null}
          current={emergencyFundProgress?.current}
          target={emergencyFundProgress?.target}
          emptyMessage="Set an emergency-fund goal in your Financial Profile and log this month's budget to see progress here."
          ctaHref="/dashboard/onboarding"
          ctaLabel="Set your goal"
        />
        <ProgressTile
          title="Retirement progress"
          progress={retirementProgress?.progress ?? null}
          current={retirementProgress?.current}
          target={retirementProgress?.target}
          isEstimate={retirementProgress?.isEstimate}
          emptyMessage="Complete your Financial Profile to see an estimated retirement progress."
          ctaHref="/dashboard/onboarding"
          ctaLabel="Complete your profile"
        />
      </div>

      <div id="monthly-budget">
        <MonthlyBudgetSection current={currentBudget} previous={previousBudget} />
      </div>

      <div className="dash-columns" style={{ marginBottom: 20 }}>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Income vs. spending</h3>
          <IncomeSpendingChart history={budgetHistory} />
        </div>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Spending by category</h3>
          <SpendingCategoryChart budget={currentBudget} />
        </div>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Savings rate trend</h3>
          <SavingsProgressChart history={budgetHistory} />
        </div>
      </div>

      <div className="dash-columns" style={{ marginBottom: 20 }}>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Debt payoff projection</h3>
          <DebtPayoffChart debts={debts} />
        </div>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Investment allocation</h3>
          <InvestmentAllocationChart allocation={netWorth.investmentAllocation} />
        </div>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Goal projections</h3>
          <GoalProjectionChart goals={goals} />
        </div>
      </div>

      <MarketDashboard snapshot={marketSnapshot} />

      <section className="dash-quick-actions">
        <Link href="/dashboard/company" className="dash-action-card">
          <Building2 size={20} />
          <span>Analyze Company</span>
        </Link>
        <Link href="/dashboard/documents" className="dash-action-card">
          <FileText size={20} />
          <span>Upload Financial Statement</span>
        </Link>
        <Link href="/dashboard/real-estate" className="dash-action-card">
          <Home size={20} />
          <span>Analyze Property</span>
        </Link>
        <Link href="/dashboard/wealth" className="dash-action-card">
          <PiggyBank size={20} />
          <span>Create Wealth Plan</span>
        </Link>
      </section>

      <div className="dash-columns">
        <UpcomingBills bills={upcomingBills} />
        <GoalsSummary goals={goals} />
        <WatchlistSummary items={watchlist} />
      </div>

      <div className="dash-columns">
        <section className="dash-section">
          <h2>Recent Reports</h2>
          {recentReports.length === 0 ? (
            <p className="disclaimer">No reports yet — try Company Research to get started.</p>
          ) : (
            <ul className="dash-list">
              {recentReports.map((r) => (
                <li key={r.id}>
                  <Link href="/dashboard/reports">
                    <span className="dash-list-title">{r.title}</span>
                    <span className="dash-list-meta">
                      {MODULE_LABELS[r.module] ?? r.module} · {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-section">
          <h2>Recent Document Uploads</h2>
          {recentDocuments.length === 0 ? (
            <p className="disclaimer">No documents analyzed yet.</p>
          ) : (
            <ul className="dash-list">
              {recentDocuments.map((r) => (
                <li key={r.id}>
                  <Link href="/dashboard/reports">
                    <span className="dash-list-title">{r.title}</span>
                    <span className="dash-list-meta">{new Date(r.created_at).toLocaleDateString()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-section">
          <h2>Recent AI Conversations</h2>
          {recentChats.length === 0 ? (
            <p className="disclaimer">No conversations yet — open a saved report and ask a question.</p>
          ) : (
            <ul className="dash-list">
              {recentChats.map((c) => (
                <li key={c.reportId}>
                  <Link href="/dashboard/reports">
                    <span className="dash-list-title">{c.title}</span>
                    <span className="dash-list-meta">
                      {MODULE_LABELS[c.module] ?? c.module} · {new Date(c.lastMessageAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
