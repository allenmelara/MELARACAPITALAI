import { createClient } from "@/lib/supabase/server";
import { getQuoteChange } from "@/lib/finnhub";
import { logWarn } from "@/lib/logger";

export type Holding = {
  id: string;
  symbol: string;
  shares: number;
  costBasis: number;
  annualDividendPerShare: number;
  createdAt: string;
};

// All queries below rely on the caller using the cookie-scoped server
// client, so Row Level Security (auth.uid() = user_id) is what actually
// restricts results to the current user — these helpers never take a
// userId to filter reads by (only inserts need it, since RLS can't infer it).

export async function listHoldings(): Promise<Holding[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("holdings")
    .select("id, symbol, shares, cost_basis, annual_dividend_per_share, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((h) => ({
    id: h.id,
    symbol: h.symbol,
    shares: Number(h.shares),
    costBasis: Number(h.cost_basis),
    annualDividendPerShare: Number(h.annual_dividend_per_share),
    createdAt: h.created_at
  }));
}

export async function addHolding(
  userId: string,
  params: { symbol: string; shares: number; costBasis: number; annualDividendPerShare?: number }
): Promise<Holding> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("holdings")
    .insert({
      user_id: userId,
      symbol: params.symbol.toUpperCase(),
      shares: params.shares,
      cost_basis: params.costBasis,
      annual_dividend_per_share: params.annualDividendPerShare ?? 0
    })
    .select("id, symbol, shares, cost_basis, annual_dividend_per_share, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    symbol: data.symbol,
    shares: Number(data.shares),
    costBasis: Number(data.cost_basis),
    annualDividendPerShare: Number(data.annual_dividend_per_share),
    createdAt: data.created_at
  };
}

export async function updateHolding(
  id: string,
  params: { shares?: number; costBasis?: number; annualDividendPerShare?: number }
): Promise<void> {
  const supabase = await createClient();
  const row: Record<string, unknown> = {};
  if (params.shares !== undefined) row.shares = params.shares;
  if (params.costBasis !== undefined) row.cost_basis = params.costBasis;
  if (params.annualDividendPerShare !== undefined) row.annual_dividend_per_share = params.annualDividendPerShare;
  const { error } = await supabase.from("holdings").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteHolding(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("holdings").delete().eq("id", id);
  if (error) throw error;
}

export type PositionValuation = {
  id: string;
  symbol: string;
  shares: number;
  costBasis: number;
  price: number | null;
  changePercent: number | null;
  marketValue: number | null;
  costTotal: number;
  gainLoss: number | null;
  gainLossPercent: number | null;
  annualDividendPerShare: number;
  annualDividendIncome: number;
  dividendYieldOnCost: number | null;
};

export type PortfolioHistoryPoint = {
  date: string;
  value: number;
  costBasis: number;
};

export type PortfolioSummary = {
  positions: PositionValuation[];
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  allocation: Array<{ symbol: string; value: number; percent: number }>;
  history: PortfolioHistoryPoint[];
  pricesUnavailable: string[];
  totalAnnualDividendIncome: number;
  portfolioDividendYieldOnCost: number;
};

async function valuePositions(holdings: Holding[]): Promise<PositionValuation[]> {
  const valued = await Promise.all(
    holdings.map(async (h) => {
      let quote: Awaited<ReturnType<typeof getQuoteChange>> = null;
      try {
        quote = await getQuoteChange(h.symbol);
      } catch (error) {
        logWarn(`portfolio.quote.${h.symbol}`, error);
      }
      const costTotal = h.shares * h.costBasis;
      const marketValue = quote ? h.shares * quote.price : null;
      const gainLoss = marketValue !== null ? marketValue - costTotal : null;
      const gainLossPercent = marketValue !== null && costTotal > 0 ? (gainLoss! / costTotal) * 100 : null;
      const annualDividendIncome = h.shares * h.annualDividendPerShare;
      const dividendYieldOnCost = costTotal > 0 ? (annualDividendIncome / costTotal) * 100 : null;
      return {
        id: h.id,
        symbol: h.symbol,
        shares: h.shares,
        costBasis: h.costBasis,
        price: quote?.price ?? null,
        changePercent: quote?.changePercent ?? null,
        marketValue,
        costTotal,
        gainLoss,
        gainLossPercent,
        annualDividendPerShare: h.annualDividendPerShare,
        annualDividendIncome,
        dividendYieldOnCost
      };
    })
  );
  return valued;
}

async function recordSnapshot(userId: string, totalValue: number, totalCostBasis: number): Promise<void> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("portfolio_snapshots").upsert(
    { user_id: userId, snapshot_date: today, total_value: totalValue, total_cost_basis: totalCostBasis },
    { onConflict: "user_id,snapshot_date" }
  );
  if (error) logWarn("portfolio.snapshot", error);
}

async function getHistory(): Promise<PortfolioHistoryPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_snapshots")
    .select("snapshot_date, total_value, total_cost_basis")
    .order("snapshot_date", { ascending: true })
    .limit(365);
  if (error) {
    logWarn("portfolio.history", error);
    return [];
  }
  return (data ?? []).map((d) => ({
    date: d.snapshot_date,
    value: Number(d.total_value),
    costBasis: Number(d.total_cost_basis)
  }));
}

export async function getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
  const holdings = await listHoldings();
  const positions = await valuePositions(holdings);

  const pricesUnavailable = positions.filter((p) => p.marketValue === null).map((p) => p.symbol);
  const totalValue = positions.reduce((sum, p) => sum + (p.marketValue ?? 0), 0);
  const totalCostBasis = positions.reduce((sum, p) => sum + p.costTotal, 0);
  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  // Back out each position's prior-day value from today's price and
  // Finnhub's own change percent, then diff against today's total — avoids
  // needing a second (rate-limited) historical-price lookup per symbol.
  let dailyChange = 0;
  for (const p of positions) {
    if (p.marketValue !== null && p.changePercent !== null && p.changePercent !== -100) {
      const previousValue = p.marketValue / (1 + p.changePercent / 100);
      dailyChange += p.marketValue - previousValue;
    }
  }
  const previousTotalValue = totalValue - dailyChange;
  const dailyChangePercent = previousTotalValue > 0 ? (dailyChange / previousTotalValue) * 100 : 0;

  const allocation = positions
    .filter((p) => p.marketValue !== null && p.marketValue > 0)
    .map((p) => ({
      symbol: p.symbol,
      value: p.marketValue as number,
      percent: totalValue > 0 ? ((p.marketValue as number) / totalValue) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value);

  const totalAnnualDividendIncome = positions.reduce((sum, p) => sum + p.annualDividendIncome, 0);
  const portfolioDividendYieldOnCost =
    totalCostBasis > 0 ? (totalAnnualDividendIncome / totalCostBasis) * 100 : 0;

  if (holdings.length > 0) {
    await recordSnapshot(userId, totalValue, totalCostBasis);
  }
  const history = await getHistory();

  return {
    positions,
    totalValue,
    totalCostBasis,
    totalGainLoss,
    totalGainLossPercent,
    dailyChange,
    dailyChangePercent,
    allocation,
    totalAnnualDividendIncome,
    portfolioDividendYieldOnCost,
    history,
    pricesUnavailable
  };
}
