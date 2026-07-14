"use client";

import { useState } from "react";
import { money } from "@/lib/finance";
import { BUDGET_CATEGORIES } from "@/lib/budgetCalc";
import type { Bill } from "@/lib/bills";

export default function BillsSection({ initialBills }: { initialBills: Bill[] }) {
  const [bills, setBills] = useState(initialBills);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [category, setCategory] = useState("");
  const [autopay, setAutopay] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOriginal, setEditOriginal] = useState<Bill | null>(null);
  const [editDraft, setEditDraft] = useState<{
    name: string;
    amount: string;
    dueDay: string;
    category: string;
    autopay: boolean;
  }>({ name: "", amount: "", dueDay: "", category: "", autopay: false });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/bills");
    const data = await response.json();
    if (response.ok) setBills(data.bills);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amountNum = Number(amount);
    const dueDayNum = Number(dueDay);
    if (!name.trim() || !(amountNum >= 0) || !(dueDayNum >= 1 && dueDayNum <= 31)) {
      setError("Enter a bill name, an amount of 0 or more, and a due day between 1 and 31.");
      return;
    }
    setAdding(true);
    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: amountNum,
          dueDay: dueDayNum,
          category: category.trim() || undefined,
          autopay
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add bill.");
      setName("");
      setAmount("");
      setDueDay("");
      setCategory("");
      setAutopay(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add bill.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/bills/${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(bill: Bill) {
    setEditingId(bill.id);
    setEditOriginal(bill);
    setEditDraft({
      name: bill.name,
      amount: String(bill.amount),
      dueDay: String(bill.dueDay),
      category: bill.category ?? "",
      autopay: bill.autopay
    });
    setError("");
  }

  // Diffs against the original bill and only PATCHes changed fields — a
  // bill whose category is a legacy free-text value (from before category
  // became an enum) would otherwise fail the whole update the moment
  // category is included unchanged, even for an edit to an unrelated field
  // like amount.
  async function handleUpdate(id: string) {
    if (!editOriginal) return;
    const amountNum = Number(editDraft.amount);
    const dueDayNum = Number(editDraft.dueDay);
    if (!editDraft.name.trim() || !(amountNum >= 0) || !(dueDayNum >= 1 && dueDayNum <= 31)) {
      setError("Enter a bill name, an amount of 0 or more, and a due day between 1 and 31.");
      return;
    }
    setError("");

    const body: Record<string, unknown> = {};
    const nameTrimmed = editDraft.name.trim();
    if (nameTrimmed !== editOriginal.name) body.name = nameTrimmed;
    if (amountNum !== editOriginal.amount) body.amount = amountNum;
    if (dueDayNum !== editOriginal.dueDay) body.dueDay = dueDayNum;
    const categoryValue = editDraft.category || null;
    if (categoryValue !== editOriginal.category) body.category = categoryValue ?? undefined;
    if (editDraft.autopay !== editOriginal.autopay) body.autopay = editDraft.autopay;

    if (Object.keys(body).length === 0) {
      setEditingId(null);
      return;
    }

    setUpdatingId(id);
    try {
      const response = await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update bill.");
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update bill.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h2 style={{ marginTop: 0 }}>Bills</h2>
      <p className="disclaimer" style={{ marginTop: 0 }}>
        Track recurring bills by their day of the month. This is a reminder list, not autopay — nothing here
        moves money.
      </p>

      <form className="form-grid" onSubmit={handleAdd}>
        <label>
          Bill name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rent" disabled={adding} />
        </label>
        <label>
          Amount
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1800"
            disabled={adding}
          />
        </label>
        <label>
          Due day of month
          <input
            type="number"
            min="1"
            max="31"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            placeholder="1"
            disabled={adding}
          />
        </label>
        <label>
          Category (optional)
          <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={adding}>
            <option value="">None</option>
            {BUDGET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={autopay} onChange={(e) => setAutopay(e.target.checked)} disabled={adding} />
          On autopay
        </label>
        <div className="actions full">
          <button className="primary" type="submit" disabled={adding}>
            {adding ? "Adding..." : "Add bill"}
          </button>
        </div>
      </form>
      {error && <div className="error">{error}</div>}

      {bills.length === 0 ? (
        <p className="disclaimer">No bills tracked yet — add one above.</p>
      ) : (
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Amount</th>
              <th>Due day</th>
              <th>Category</th>
              <th>Autopay</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) =>
              editingId === b.id ? (
                <tr key={b.id}>
                  <td>
                    <input value={editDraft.name} onChange={(e) => setEditDraft((v) => ({ ...v, name: e.target.value }))} />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      value={editDraft.amount}
                      onChange={(e) => setEditDraft((v) => ({ ...v, amount: e.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={editDraft.dueDay}
                      onChange={(e) => setEditDraft((v) => ({ ...v, dueDay: e.target.value }))}
                    />
                  </td>
                  <td>
                    <select
                      value={editDraft.category}
                      onChange={(e) => setEditDraft((v) => ({ ...v, category: e.target.value }))}
                    >
                      <option value="">None</option>
                      {/* A legacy free-text category (from before category became an enum)
                          gets its own option so the field round-trips correctly instead of
                          silently defaulting away from the real stored value. */}
                      {b.category && !(BUDGET_CATEGORIES as readonly string[]).includes(b.category) && (
                        <option value={b.category}>{b.category} (legacy)</option>
                      )}
                      {BUDGET_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={editDraft.autopay}
                      onChange={(e) => setEditDraft((v) => ({ ...v, autopay: e.target.checked }))}
                    />
                  </td>
                  <td>
                    <button
                      className="secondary portfolio-remove"
                      onClick={() => handleUpdate(b.id)}
                      disabled={updatingId === b.id}
                    >
                      {updatingId === b.id ? "..." : "Save"}
                    </button>
                    <button className="secondary portfolio-remove" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{money(b.amount)}</td>
                  <td>{b.dueDay}</td>
                  <td>{b.category || "—"}</td>
                  <td>{b.autopay ? "Yes" : "No"}</td>
                  <td>
                    <button className="secondary portfolio-remove" onClick={() => startEdit(b)}>
                      Edit
                    </button>
                    <button
                      className="secondary portfolio-remove"
                      onClick={() => handleDelete(b.id)}
                      disabled={deletingId === b.id}
                    >
                      {deletingId === b.id ? "..." : "Remove"}
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
