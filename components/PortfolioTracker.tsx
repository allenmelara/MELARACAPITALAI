"use client";

import { useState } from "react";
import { money } from "@/lib/finance";
import type { PortfolioSummary } from "@/lib/portfolio";
import type { WatchlistQuote } from "@/lib/watchlist";
import PortfolioChart from "@/components/PortfolioChart";

const ALLOCATION_COLORS = ["#69e59b", "#6bd4e5", "#e5c76b", "#e58f6b", "#a56be5", "#e56bb0", "#6be58a", "#e5e06b"];

function ChangeText({ value, percent }: { value: number; percent?: number }) {
  const positive = value >= 0;
  return (
    <span className={positive ? "market-up" : "market-down"}>
      {positive ? "+" : ""}
      {money(value)}
      {percent !== undefined && ` (${positive ? "+" : ""}${percent.toFixed(2)}%)`}
    </span>
  );
}

export default function PortfolioTracker({
  initialSummary,
  initialWatchlist
}: {
  initialSummary: PortfolioSummary;
  initialWatchlist: WatchlistQuote[];
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [dividendPerShare, setDividendPerShare] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [watchlist, setWatchlist] = useState(initialWatchlist);
  const [watchSymbol, setWatchSymbol] = useState("");
  const [watchAdding, setWatchAdding] = useState(false);
  const [watchError, setWatchError] = useState("");
  const [watchDeletingId, setWatchDeletingId] = useState<string | null>(null);
  const [thresholdDrafts, setThresholdDrafts] = useState<Record<string, string>>({});

  async function refresh() {
    const response = await fetch("/api/portfolio");
    const data = await response.json();
    if (response.ok) setSummary(data.summary);
  }

  async function refreshWatchlist() {
    const response = await fetch("/api/watchlist");
    const data = await response.json();
    if (response.ok) setWatchlist(data.items);
  }

  async function handleAddWatch(e: React.FormEvent) {
    e.preventDefault();
    setWatchError("");
    if (!watchSymbol.trim()) {
      setWatchError("Enter a ticker symbol.");
      return;
    }
    setWatchAdding(true);
    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: watchSymbol.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add to watchlist.");
      setWatchSymbol("");
      await refreshWatchlist();
    } catch (err) {
      setWatchError(err instanceof Error ? err.message : "Failed to add to watchlist.");
    } finally {
      setWatchAdding(false);
    }
  }

  async function handleDeleteWatch(id: string) {
    setWatchDeletingId(id);
    try {
      await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
      await refreshWatchlist();
    } finally {
      setWatchDeletingId(null);
    }
  }

  async function handleThresholdBlur(id: string, currentValue: number) {
    const draft = thresholdDrafts[id];
    if (draft === undefined) return;
    const value = Number(draft);
    if (!(value >= 0) || value === currentValue) {
      setThresholdDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    try {
      await fetch(`/api/watchlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertThresholdPct: value })
      });
      await refreshWatchlist();
    } finally {
      setThresholdDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const sharesNum = Number(shares);
    const costBasisNum = Number(costBasis);
    if (!symbol.trim() || !(sharesNum > 0) || !(costBasisNum >= 0)) {
      setError("Enter a ticker, a positive share count, and a cost basis.");
      return;
    }
    setAdding(true);
    try {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.trim(),
          shares: sharesNum,
          costBasis: costBasisNum,
          annualDividendPerShare: Number(dividendPerShare) || 0
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add holding.");
      setSymbol("");
      setShares("");
      setCostBasis("");
      setDividendPerShare("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add holding.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="panel">
      <h2>Portfolio Tracker</h2>
      <p className="disclaimer">
        Manually-entered holdings — no brokerage account is connected. Educational tracking only, not investment
        advice.
      </p>

      <div className="metrics">
        <div className="metric">
          <span>Total value</span>
          <strong>{money(summary.totalValue)}</strong>
        </div>
        <div className="metric">
          <span>Daily gain/loss</span>
          <strong>
            <ChangeText value={summary.dailyChange} percent={summary.dailyChangePercent} />
          </strong>
        </div>
        <div className="metric">
          <span>Total gain/loss</span>
          <strong>
            <ChangeText value={summary.totalGainLoss} percent={summary.totalGainLossPercent} />
          </strong>
        </div>
        <div className="metric">
          <span>Cost basis</span>
          <strong>{money(summary.totalCostBasis)}</strong>
        </div>
        <div className="metric">
          <span>Dividend income (annual)</span>
          <strong>
            {money(summary.totalAnnualDividendIncome)}
            {summary.totalAnnualDividendIncome > 0 && (
              <span className="dividend-yield"> ({summary.portfolioDividendYieldOnCost.toFixed(2)}% on cost)</span>
            )}
          </strong>
        </div>
      </div>

      {summary.pricesUnavailable.length > 0 && (
        <p className="error">
          Couldn&apos;t fetch a live price for: {summary.pricesUnavailable.join(", ")}. Excluded from totals above.
        </p>
      )}

      <form className="form-grid" onSubmit={handleAdd}>
        <label>
          Ticker
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="AAPL" disabled={adding} />
        </label>
        <label>
          Shares
          <input
            type="number"
            step="any"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="10"
            disabled={adding}
          />
        </label>
        <label>
          Cost basis (per share)
          <input
            type="number"
            step="any"
            value={costBasis}
            onChange={(e) => setCostBasis(e.target.value)}
            placeholder="150.00"
            disabled={adding}
          />
        </label>
        <label>
          Annual dividend/share (optional)
          <input
            type="number"
            step="any"
            value={dividendPerShare}
            onChange={(e) => setDividendPerShare(e.target.value)}
            placeholder="0.96"
            disabled={adding}
          />
        </label>
        <div className="actions full">
          <button className="primary" type="submit" disabled={adding}>
            {adding ? "Adding..." : "Add holding"}
          </button>
        </div>
      </form>
      {error && <div className="error">{error}</div>}

      {summary.positions.length === 0 ? (
        <p className="disclaimer">No holdings yet — add one above to start tracking your portfolio.</p>
      ) : (
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Shares</th>
              <th>Price</th>
              <th>Market value</th>
              <th>Gain/loss</th>
              <th>Dividend/yr</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {summary.positions.map((p) => (
              <tr key={p.id}>
                <td>{p.symbol}</td>
                <td>{p.shares}</td>
                <td>{p.price !== null ? money(p.price) : "—"}</td>
                <td>{p.marketValue !== null ? money(p.marketValue) : "—"}</td>
                <td>
                  {p.gainLoss !== null && p.gainLossPercent !== null ? (
                    <ChangeText value={p.gainLoss} percent={p.gainLossPercent} />
                  ) : (
                    "—"
                  )}
                </td>
                <td>{p.annualDividendIncome > 0 ? money(p.annualDividendIncome) : "—"}</td>
                <td>
                  <button
                    className="secondary portfolio-remove"
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                  >
                    {deletingId === p.id ? "..." : "Remove"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {summary.allocation.length > 0 && (
        <div className="portfolio-allocation">
          <h3>Asset Allocation</h3>
          <div className="allocation-bar">
            {summary.allocation.map((a, i) => (
              <div
                key={a.symbol}
                className="allocation-segment"
                style={{ width: `${a.percent}%`, background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}
                title={`${a.symbol}: ${a.percent.toFixed(1)}%`}
              />
            ))}
          </div>
          <ul className="allocation-legend">
            {summary.allocation.map((a, i) => (
              <li key={a.symbol}>
                <span
                  className="allocation-swatch"
                  style={{ background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}
                />
                {a.symbol} — {a.percent.toFixed(1)}%
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="portfolio-chart">
        <h3>Performance</h3>
        <PortfolioChart history={summary.history} />
      </div>

      <div className="portfolio-watchlist">
        <h3>Watchlist</h3>
        <p className="disclaimer" style={{ marginTop: 0 }}>
          Symbols you're following but don't own — not counted in the totals above. You'll get a notification when a
          symbol moves past its alert threshold on a given day.
        </p>
        <form className="form-grid" onSubmit={handleAddWatch}>
          <label>
            Ticker
            <input
              value={watchSymbol}
              onChange={(e) => setWatchSymbol(e.target.value)}
              placeholder="NVDA"
              disabled={watchAdding}
            />
          </label>
          <div className="actions full">
            <button className="primary" type="submit" disabled={watchAdding}>
              {watchAdding ? "Adding..." : "Add to watchlist"}
            </button>
          </div>
        </form>
        {watchError && <div className="error">{watchError}</div>}

        {watchlist.length === 0 ? (
          <p className="disclaimer">Nothing on your watchlist yet — add a ticker above.</p>
        ) : (
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Price</th>
                <th>Change</th>
                <th>Alert at ±%</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((w) => (
                <tr key={w.id}>
                  <td>{w.symbol}</td>
                  <td>{w.price !== null ? money(w.price) : "—"}</td>
                  <td>
                    {w.changePercent !== null ? (
                      <span className={w.changePercent >= 0 ? "market-up" : "market-down"}>
                        {w.changePercent >= 0 ? "+" : ""}
                        {w.changePercent.toFixed(2)}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      style={{ width: 70 }}
                      value={thresholdDrafts[w.id] ?? String(w.alertThresholdPct)}
                      onChange={(e) => setThresholdDrafts((current) => ({ ...current, [w.id]: e.target.value }))}
                      onBlur={() => handleThresholdBlur(w.id, w.alertThresholdPct)}
                    />
                  </td>
                  <td>
                    <button
                      className="secondary portfolio-remove"
                      onClick={() => handleDeleteWatch(w.id)}
                      disabled={watchDeletingId === w.id}
                    >
                      {watchDeletingId === w.id ? "..." : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
