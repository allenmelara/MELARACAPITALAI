"use client";

import { useState } from "react";
import { money } from "@/lib/finance";
import type { PortfolioSummary } from "@/lib/portfolio";
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

export default function PortfolioTracker({ initialSummary }: { initialSummary: PortfolioSummary }) {
  const [summary, setSummary] = useState(initialSummary);
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [dividendPerShare, setDividendPerShare] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/portfolio");
    const data = await response.json();
    if (response.ok) setSummary(data.summary);
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
    </div>
  );
}
