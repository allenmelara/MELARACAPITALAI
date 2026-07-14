"use client";

import { useState } from "react";
import Link from "next/link";
import { money } from "@/lib/finance";
import type { RealEstateHolding } from "@/lib/realEstateHoldings";

export default function RealEstateHoldingsSection({ initialHoldings }: { initialHoldings: RealEstateHolding[] }) {
  const [holdings, setHoldings] = useState(initialHoldings);
  const [name, setName] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [mortgageBalance, setMortgageBalance] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; estimatedValue: string; mortgageBalance: string }>({
    name: "",
    estimatedValue: "",
    mortgageBalance: ""
  });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/real-estate-holdings");
    const data = await response.json();
    if (response.ok) setHoldings(data.holdings);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const valueNum = Number(estimatedValue);
    if (!name.trim() || !(valueNum >= 0)) {
      setError("Enter a property name and an estimated value of 0 or more.");
      return;
    }
    setAdding(true);
    try {
      const response = await fetch("/api/real-estate-holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          estimatedValue: valueNum,
          mortgageBalance: mortgageBalance ? Number(mortgageBalance) : undefined
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add property.");
      setName("");
      setEstimatedValue("");
      setMortgageBalance("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add property.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/real-estate-holdings/${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(holding: RealEstateHolding) {
    setEditingId(holding.id);
    setEditDraft({
      name: holding.name,
      estimatedValue: String(holding.estimatedValue),
      mortgageBalance: String(holding.mortgageBalance)
    });
    setError("");
  }

  async function handleUpdate(id: string) {
    const valueNum = Number(editDraft.estimatedValue);
    if (!editDraft.name.trim() || !(valueNum >= 0)) {
      setError("Enter a property name and an estimated value of 0 or more.");
      return;
    }
    setError("");
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/real-estate-holdings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name.trim(),
          estimatedValue: valueNum,
          mortgageBalance: editDraft.mortgageBalance ? Number(editDraft.mortgageBalance) : undefined
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update property.");
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update property.");
    } finally {
      setUpdatingId(null);
    }
  }

  const totalEquity = holdings.reduce((sum, h) => sum + (h.estimatedValue - h.mortgageBalance), 0);

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h2 style={{ marginTop: 0 }}>Real estate</h2>
      <p className="disclaimer" style={{ marginTop: 0 }}>
        Manually-entered property estimates. For a full investment-return projection on a property, use the{" "}
        <Link href="/dashboard/real-estate">Real Estate calculator</Link> instead — this section just tracks equity
        you already hold.
      </p>

      <div className="metrics">
        <div className="metric">
          <span>Total equity</span>
          <strong>{money(totalEquity)}</strong>
        </div>
      </div>

      <form className="form-grid" onSubmit={handleAdd}>
        <label>
          Property name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Primary residence" disabled={adding} />
        </label>
        <label>
          Estimated value
          <input
            type="number"
            step="any"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            placeholder="450000"
            disabled={adding}
          />
        </label>
        <label>
          Mortgage balance (optional)
          <input
            type="number"
            step="any"
            value={mortgageBalance}
            onChange={(e) => setMortgageBalance(e.target.value)}
            placeholder="310000"
            disabled={adding}
          />
        </label>
        <div className="actions full">
          <button className="primary" type="submit" disabled={adding}>
            {adding ? "Adding..." : "Add property"}
          </button>
        </div>
      </form>
      {error && <div className="error">{error}</div>}

      {holdings.length === 0 ? (
        <p className="disclaimer">No properties tracked yet — add one above.</p>
      ) : (
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Estimated value</th>
              <th>Mortgage balance</th>
              <th>Equity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) =>
              editingId === h.id ? (
                <tr key={h.id}>
                  <td>
                    <input value={editDraft.name} onChange={(e) => setEditDraft((v) => ({ ...v, name: e.target.value }))} />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      value={editDraft.estimatedValue}
                      onChange={(e) => setEditDraft((v) => ({ ...v, estimatedValue: e.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      value={editDraft.mortgageBalance}
                      onChange={(e) => setEditDraft((v) => ({ ...v, mortgageBalance: e.target.value }))}
                    />
                  </td>
                  <td>
                    {money(
                      (Number(editDraft.estimatedValue) || 0) - (Number(editDraft.mortgageBalance) || 0)
                    )}
                  </td>
                  <td>
                    <button
                      className="secondary portfolio-remove"
                      onClick={() => handleUpdate(h.id)}
                      disabled={updatingId === h.id}
                    >
                      {updatingId === h.id ? "..." : "Save"}
                    </button>
                    <button className="secondary portfolio-remove" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={h.id}>
                  <td>{h.name}</td>
                  <td>{money(h.estimatedValue)}</td>
                  <td>{money(h.mortgageBalance)}</td>
                  <td>{money(h.estimatedValue - h.mortgageBalance)}</td>
                  <td>
                    <button className="secondary portfolio-remove" onClick={() => startEdit(h)}>
                      Edit
                    </button>
                    <button
                      className="secondary portfolio-remove"
                      onClick={() => handleDelete(h.id)}
                      disabled={deletingId === h.id}
                    >
                      {deletingId === h.id ? "..." : "Remove"}
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
