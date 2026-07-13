"use client";

import { useState } from "react";
import { money, percent } from "@/lib/finance";
import type { FinancialGoal, GoalCategory } from "@/lib/financialGoals";

const CATEGORY_LABELS: Record<GoalCategory, string> = {
  emergency_fund: "Emergency fund",
  retirement: "Retirement",
  home: "Home",
  debt_payoff: "Debt payoff",
  education: "Education",
  business: "Business",
  general: "General"
};

export default function GoalsTracker({ initialGoals }: { initialGoals: FinancialGoal[] }) {
  const [goals, setGoals] = useState(initialGoals);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<GoalCategory | "">("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [progressDrafts, setProgressDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/financial-goals");
    const data = await response.json();
    if (response.ok) setGoals(data.goals);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const targetNum = Number(targetAmount);
    if (!name.trim() || !(targetNum > 0)) {
      setError("Enter a goal name and a target amount greater than 0.");
      return;
    }
    setAdding(true);
    try {
      const response = await fetch("/api/financial-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category || undefined,
          targetAmount: targetNum,
          currentAmount: currentAmount ? Number(currentAmount) : undefined,
          targetDate: targetDate || undefined
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add goal.");
      setName("");
      setCategory("");
      setTargetAmount("");
      setCurrentAmount("");
      setTargetDate("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add goal.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/financial-goals/${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSaveProgress(id: string) {
    const draft = progressDrafts[id];
    if (draft === undefined) return;
    const amount = Number(draft);
    if (!(amount >= 0)) {
      setError("Enter a progress amount of 0 or more.");
      return;
    }
    setError("");
    setSavingId(id);
    try {
      const response = await fetch(`/api/financial-goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentAmount: amount })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update progress.");
      await refresh();
      setProgressDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update progress.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="panel">
      <h2>Financial goals</h2>
      <p className="disclaimer" style={{ marginTop: 0 }}>
        Set a target and track progress toward it. Educational tracking only — not a guarantee you'll reach any
        goal.
      </p>

      <form className="form-grid" onSubmit={handleAdd}>
        <label>
          Goal name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Down payment" disabled={adding} />
        </label>
        <label>
          Category (optional)
          <select value={category} onChange={(e) => setCategory(e.target.value as GoalCategory | "")} disabled={adding}>
            <option value="">None</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Target amount
          <input
            type="number"
            step="any"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="50000"
            disabled={adding}
          />
        </label>
        <label>
          Current amount (optional)
          <input
            type="number"
            step="any"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            placeholder="5000"
            disabled={adding}
          />
        </label>
        <label>
          Target date (optional)
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} disabled={adding} />
        </label>
        <div className="actions full">
          <button className="primary" type="submit" disabled={adding}>
            {adding ? "Adding..." : "Add goal"}
          </button>
        </div>
      </form>
      {error && <div className="error">{error}</div>}

      {goals.length === 0 ? (
        <p className="disclaimer">No goals yet — add one above to start tracking progress.</p>
      ) : (
        <ul className="goals-list">
          {goals.map((g) => {
            const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
            return (
              <li key={g.id} className="goal-row">
                <div className="usage-bar-block">
                  <div className="usage-bar-label">
                    <span>
                      {g.name}
                      {g.category && ` · ${CATEGORY_LABELS[g.category]}`}
                    </span>
                    <span>
                      {money(g.currentAmount)} / {money(g.targetAmount)} ({percent(pct / 100)})
                    </span>
                  </div>
                  <div className="usage-bar-track">
                    <div className="usage-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {g.targetDate && <p className="disclaimer goal-date">Target date: {g.targetDate}</p>}
                <div className="goal-actions">
                  <input
                    type="number"
                    step="any"
                    placeholder="Update progress"
                    value={progressDrafts[g.id] ?? ""}
                    onChange={(e) => setProgressDrafts((current) => ({ ...current, [g.id]: e.target.value }))}
                  />
                  <button
                    className="secondary"
                    onClick={() => handleSaveProgress(g.id)}
                    disabled={savingId === g.id || progressDrafts[g.id] === undefined}
                  >
                    {savingId === g.id ? "Saving..." : "Save"}
                  </button>
                  <button className="secondary" onClick={() => handleDelete(g.id)} disabled={deletingId === g.id}>
                    {deletingId === g.id ? "..." : "Remove"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
