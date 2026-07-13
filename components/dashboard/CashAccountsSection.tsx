"use client";

import { useState } from "react";
import { money } from "@/lib/finance";
import type { CashAccount, CashAccountType } from "@/lib/cashAccounts";

const TYPE_LABELS: Record<CashAccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  emergency_fund: "Emergency fund",
  other: "Other"
};

export default function CashAccountsSection({ initialAccounts }: { initialAccounts: CashAccount[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<CashAccountType>("checking");
  const [balance, setBalance] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/cash-accounts");
    const data = await response.json();
    if (response.ok) setAccounts(data.accounts);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const balanceNum = Number(balance);
    if (!name.trim() || !(balanceNum >= 0)) {
      setError("Enter an account name and a balance of 0 or more.");
      return;
    }
    setAdding(true);
    try {
      const response = await fetch("/api/cash-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), accountType, balance: balanceNum })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add account.");
      setName("");
      setBalance("");
      setAccountType("checking");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add account.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/cash-accounts/${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h2 style={{ marginTop: 0 }}>Cash accounts</h2>
      <p className="disclaimer" style={{ marginTop: 0 }}>
        Manually-entered balances — no bank account is connected. Flag an account "Emergency fund" so its balance
        counts toward your emergency-fund progress on the dashboard.
      </p>

      <div className="metrics">
        <div className="metric">
          <span>Total cash</span>
          <strong>{money(total)}</strong>
        </div>
      </div>

      <form className="form-grid" onSubmit={handleAdd}>
        <label>
          Account name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Main checking" disabled={adding} />
        </label>
        <label>
          Type
          <select value={accountType} onChange={(e) => setAccountType(e.target.value as CashAccountType)} disabled={adding}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="emergency_fund">Emergency fund</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Balance
          <input
            type="number"
            step="any"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="5000"
            disabled={adding}
          />
        </label>
        <div className="actions full">
          <button className="primary" type="submit" disabled={adding}>
            {adding ? "Adding..." : "Add account"}
          </button>
        </div>
      </form>
      {error && <div className="error">{error}</div>}

      {accounts.length === 0 ? (
        <p className="disclaimer">No cash accounts yet — add one above to start tracking your cash.</p>
      ) : (
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Balance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{TYPE_LABELS[a.accountType]}</td>
                <td>{money(a.balance)}</td>
                <td>
                  <button
                    className="secondary portfolio-remove"
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                  >
                    {deletingId === a.id ? "..." : "Remove"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
