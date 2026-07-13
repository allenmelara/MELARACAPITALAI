"use client";

import { useState } from "react";
import { money, percent } from "@/lib/finance";
import { BUDGET_CATEGORIES, totalSpending } from "@/lib/budgetCalc";
import type { MonthlyBudget } from "@/lib/monthlyBudget";

export default function MonthlyBudgetSection({
  current,
  previous
}: {
  current: MonthlyBudget | null;
  previous: MonthlyBudget | null;
}) {
  const seed = current ?? previous;
  const [income, setIncome] = useState(seed ? String(seed.income) : "");
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const category of BUDGET_CATEGORIES) {
      const existing = seed?.categories.find((c) => c.category === category);
      initial[category] = existing ? String(existing.amount) : "";
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(!current);

  const categories = BUDGET_CATEGORIES.map((category) => ({
    category,
    amount: Number(amounts[category]) || 0
  })).filter((c) => c.amount > 0);
  const spending = totalSpending({ categories });
  const incomeNum = Number(income) || 0;
  const savingsRate = incomeNum > 0 ? (incomeNum - spending) / incomeNum : 0;

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/monthly-budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ income: incomeNum, categories })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save your budget.");
      setMessage("Saved this month's budget.");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save your budget.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing && current) {
    return (
      <div className="panel" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>This month's budget</h2>
        <div className="metrics">
          <div className="metric">
            <span>Income</span>
            <strong>{money(current.income)}</strong>
          </div>
          <div className="metric">
            <span>Spending</span>
            <strong>{money(totalSpending(current))}</strong>
          </div>
          <div className="metric">
            <span>Savings rate</span>
            <strong>{percent(savingsRate)}</strong>
          </div>
        </div>
        <div className="actions">
          <button className="secondary" onClick={() => setEditing(true)}>
            Edit this month
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h2 style={{ marginTop: 0 }}>Log this month's budget</h2>
      <p className="disclaimer" style={{ marginTop: 0 }}>
        A quick monthly check-in, not a transaction ledger — enter your income and roughly what you spent per
        category. {previous && !current && "Pre-filled from last month — adjust as needed."}
      </p>

      <div className="form-grid">
        <label>
          Monthly income
          <input type="number" step="any" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="6000" />
        </label>
        {BUDGET_CATEGORIES.map((category) => (
          <label key={category}>
            {category}
            <input
              type="number"
              step="any"
              value={amounts[category]}
              onChange={(e) => setAmounts((current) => ({ ...current, [category]: e.target.value }))}
              placeholder="0"
            />
          </label>
        ))}
      </div>

      <div className="metrics">
        <div className="metric">
          <span>Total spending</span>
          <strong>{money(spending)}</strong>
        </div>
        <div className="metric">
          <span>Savings rate</span>
          <strong>{percent(savingsRate)}</strong>
        </div>
      </div>

      <div className="actions">
        <button className="primary" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save this month"}
        </button>
        {current && (
          <button className="secondary" onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      {message && <div className="notice">{message}</div>}
    </div>
  );
}
