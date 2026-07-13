import { money, percent } from "@/lib/finance";
import type { NetWorthSummary as NetWorthSummaryData } from "@/lib/netWorth";
import type { MonthlyBudget } from "@/lib/monthlyBudget";
import { totalSpending } from "@/lib/monthlyBudget";
import MetricTile from "@/components/dashboard/MetricTile";

const SAMPLE = {
  netWorth: 84500,
  cash: 12000,
  investments: 45000,
  realEstateEquity: 35000,
  debt: 7500,
  income: 6000,
  spending: 4200
};

export default function NetWorthSummary({
  netWorth,
  hasCash,
  hasDebt,
  hasInvestments,
  hasRealEstate,
  currentBudget
}: {
  netWorth: NetWorthSummaryData;
  hasCash: boolean;
  hasDebt: boolean;
  hasInvestments: boolean;
  hasRealEstate: boolean;
  currentBudget: MonthlyBudget | null;
}) {
  const hasAnyAssetData = hasCash || hasDebt || hasInvestments || hasRealEstate;
  const spending = currentBudget ? totalSpending(currentBudget) : null;
  const savingsRate = currentBudget && currentBudget.income > 0 ? (currentBudget.income - (spending ?? 0)) / currentBudget.income : null;

  return (
    <section className="dash-section" style={{ marginBottom: 20 }}>
      <h2>Net worth</h2>
      <div className="metrics">
        <MetricTile
          label="Net worth"
          value={money(hasAnyAssetData ? netWorth.netWorth : SAMPLE.netWorth)}
          isSample={!hasAnyAssetData}
          ctaHref="/dashboard/accounts"
          ctaLabel="Add your accounts"
        />
        <MetricTile
          label="Cash"
          value={money(hasCash ? netWorth.cash : SAMPLE.cash)}
          isSample={!hasCash}
          ctaHref="/dashboard/accounts"
          ctaLabel="Add a cash account"
        />
        <MetricTile
          label="Investments"
          value={money(hasInvestments ? netWorth.investments : SAMPLE.investments)}
          isSample={!hasInvestments}
          ctaHref="/dashboard/portfolio"
          ctaLabel="Add a holding"
        />
        <MetricTile
          label="Real estate equity"
          value={money(hasRealEstate ? netWorth.realEstateEquity : SAMPLE.realEstateEquity)}
          isSample={!hasRealEstate}
          ctaHref="/dashboard/accounts"
          ctaLabel="Add a property"
        />
        <MetricTile
          label="Debt"
          value={money(hasDebt ? netWorth.debt : SAMPLE.debt)}
          isSample={!hasDebt}
          ctaHref="/dashboard/accounts"
          ctaLabel="Add a debt"
        />
        <MetricTile
          label="Monthly income"
          value={money(currentBudget ? currentBudget.income : SAMPLE.income)}
          isSample={!currentBudget}
          ctaHref="#monthly-budget"
          ctaLabel="Log this month"
        />
        <MetricTile
          label="Monthly spending"
          value={money(spending ?? SAMPLE.spending)}
          isSample={!currentBudget}
          ctaHref="#monthly-budget"
          ctaLabel="Log this month"
        />
        <MetricTile
          label="Savings rate"
          value={percent(savingsRate ?? (SAMPLE.income - SAMPLE.spending) / SAMPLE.income)}
          isSample={savingsRate === null}
          ctaHref="#monthly-budget"
          ctaLabel="Log this month"
        />
      </div>
    </section>
  );
}
