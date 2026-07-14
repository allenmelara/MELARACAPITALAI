"use client";

import { useState } from "react";
import { money } from "@/lib/finance";
import type { Debt, DebtType } from "@/lib/debts";

const TYPE_LABELS: Record<DebtType, string> = {
  credit_card: "Credit card",
  student_loan: "Student loan",
  auto_loan: "Auto loan",
  mortgage: "Mortgage",
  personal_loan: "Personal loan",
  other: "Other"
};

export default function DebtsSection({ initialDebts }: { initialDebts: Debt[] }) {
  const [debts, setDebts] = useState(initialDebts);
  const [name, setName] = useState("");
  const [debtType, setDebtType] = useState<DebtType>("credit_card");
  const [balance, setBalance] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [minimumPayment, setMinimumPayment] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    name: string;
    debtType: DebtType;
    balance: string;
    interestRate: string;
    minimumPayment: string;
  }>({ name: "", debtType: "credit_card", balance: "", interestRate: "", minimumPayment: "" });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/debts");
    const data = await response.json();
    if (response.ok) setDebts(data.debts);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const balanceNum = Number(balance);
    if (!name.trim() || !(balanceNum >= 0)) {
      setError("Enter a debt name and a balance of 0 or more.");
      return;
    }
    setAdding(true);
    try {
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          debtType,
          balance: balanceNum,
          interestRate: interestRate ? Number(interestRate) : undefined,
          minimumPayment: minimumPayment ? Number(minimumPayment) : undefined
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add debt.");
      setName("");
      setBalance("");
      setInterestRate("");
      setMinimumPayment("");
      setDebtType("credit_card");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add debt.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/debts/${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(debt: Debt) {
    setEditingId(debt.id);
    setEditDraft({
      name: debt.name,
      debtType: debt.debtType,
      balance: String(debt.balance),
      interestRate: debt.interestRate !== null ? String(debt.interestRate) : "",
      minimumPayment: debt.minimumPayment !== null ? String(debt.minimumPayment) : ""
    });
    setError("");
  }

  async function handleUpdate(id: string) {
    const balanceNum = Number(editDraft.balance);
    if (!editDraft.name.trim() || !(balanceNum >= 0)) {
      setError("Enter a debt name and a balance of 0 or more.");
      return;
    }
    setError("");
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/debts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name.trim(),
          debtType: editDraft.debtType,
          balance: balanceNum,
          interestRate: editDraft.interestRate ? Number(editDraft.interestRate) : undefined,
          minimumPayment: editDraft.minimumPayment ? Number(editDraft.minimumPayment) : undefined
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update debt.");
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update debt.");
    } finally {
      setUpdatingId(null);
    }
  }

  const total = debts.reduce((sum, d) => sum + d.balance, 0);

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h2 style={{ marginTop: 0 }}>Debts</h2>
      <p className="disclaimer" style={{ marginTop: 0 }}>
        Manually-entered balances. Interest rate and minimum payment are optional but power the debt-payoff
        projection on your dashboard.
      </p>

      <div className="metrics">
        <div className="metric">
          <span>Total debt</span>
          <strong>{money(total)}</strong>
        </div>
      </div>

      <form className="form-grid" onSubmit={handleAdd}>
        <label>
          Debt name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Visa card" disabled={adding} />
        </label>
        <label>
          Type
          <select value={debtType} onChange={(e) => setDebtType(e.target.value as DebtType)} disabled={adding}>
            <option value="credit_card">Credit card</option>
            <option value="student_loan">Student loan</option>
            <option value="auto_loan">Auto loan</option>
            <option value="mortgage">Mortgage</option>
            <option value="personal_loan">Personal loan</option>
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
            placeholder="4200"
            disabled={adding}
          />
        </label>
        <label>
          Interest rate % (optional)
          <input
            type="number"
            step="any"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            placeholder="19.99"
            disabled={adding}
          />
        </label>
        <label>
          Minimum payment (optional)
          <input
            type="number"
            step="any"
            value={minimumPayment}
            onChange={(e) => setMinimumPayment(e.target.value)}
            placeholder="120"
            disabled={adding}
          />
        </label>
        <div className="actions full">
          <button className="primary" type="submit" disabled={adding}>
            {adding ? "Adding..." : "Add debt"}
          </button>
        </div>
      </form>
      {error && <div className="error">{error}</div>}

      {debts.length === 0 ? (
        <p className="disclaimer">No debts tracked yet — add one above.</p>
      ) : (
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Balance</th>
              <th>Rate</th>
              <th>Min. payment</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {debts.map((d) =>
              editingId === d.id ? (
                <tr key={d.id}>
                  <td>
                    <input value={editDraft.name} onChange={(e) => setEditDraft((v) => ({ ...v, name: e.target.value }))} />
                  </td>
                  <td>
                    <select
                      value={editDraft.debtType}
                      onChange={(e) => setEditDraft((v) => ({ ...v, debtType: e.target.value as DebtType }))}
                    >
                      <option value="credit_card">Credit card</option>
                      <option value="student_loan">Student loan</option>
                      <option value="auto_loan">Auto loan</option>
                      <option value="mortgage">Mortgage</option>
                      <option value="personal_loan">Personal loan</option>
                      <option value="other">Other</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      value={editDraft.balance}
                      onChange={(e) => setEditDraft((v) => ({ ...v, balance: e.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      value={editDraft.interestRate}
                      onChange={(e) => setEditDraft((v) => ({ ...v, interestRate: e.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      value={editDraft.minimumPayment}
                      onChange={(e) => setEditDraft((v) => ({ ...v, minimumPayment: e.target.value }))}
                    />
                  </td>
                  <td>
                    <button
                      className="secondary portfolio-remove"
                      onClick={() => handleUpdate(d.id)}
                      disabled={updatingId === d.id}
                    >
                      {updatingId === d.id ? "..." : "Save"}
                    </button>
                    <button className="secondary portfolio-remove" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{TYPE_LABELS[d.debtType]}</td>
                  <td>{money(d.balance)}</td>
                  <td>{d.interestRate !== null ? `${d.interestRate.toFixed(2)}%` : "—"}</td>
                  <td>{d.minimumPayment !== null ? money(d.minimumPayment) : "—"}</td>
                  <td>
                    <button className="secondary portfolio-remove" onClick={() => startEdit(d)}>
                      Edit
                    </button>
                    <button
                      className="secondary portfolio-remove"
                      onClick={() => handleDelete(d.id)}
                      disabled={deletingId === d.id}
                    >
                      {deletingId === d.id ? "..." : "Remove"}
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
