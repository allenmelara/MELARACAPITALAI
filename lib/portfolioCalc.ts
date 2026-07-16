// Pure calculator, deliberately dependency-free (no supabase/server import)
// — see lib/portfolio.ts for the CRUD half. Computes the resulting
// weighted-average cost basis when merging a newly-extracted lot into an
// existing holding of the same symbol, instead of silently adding a
// duplicate row: lib/portfolio.ts has no updateHolding history-merge logic
// of its own, and two rows of the same symbol don't merge anywhere in the
// portfolio summary (their dollar totals sum correctly, but nothing reports
// a correct blended per-share cost basis across rows).

export function mergeHoldingLot(
  existing: { shares: number; costBasis: number },
  incoming: { shares: number; costBasis: number }
): { shares: number; costBasis: number } {
  const totalShares = existing.shares + incoming.shares;
  if (totalShares <= 0) return { shares: 0, costBasis: 0 };
  const weightedCostBasis = (existing.shares * existing.costBasis + incoming.shares * incoming.costBasis) / totalShares;
  return { shares: totalShares, costBasis: weightedCostBasis };
}
