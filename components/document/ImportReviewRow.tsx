"use client";

import ConfidenceBadge from "@/components/document/ConfidenceBadge";
import type { ExtractedDocumentItem } from "@/lib/prompts";
import { BUDGET_CATEGORIES } from "@/lib/budgetCalc";

export type ReviewItem = {
  key: string;
  data: ExtractedDocumentItem;
  included: boolean;
  action: "add" | "update";
  targetId: string | null;
  matchType: "match" | "ambiguous" | "none";
};

const CATEGORY_LABELS: Record<ExtractedDocumentItem["category"], string> = {
  cash_account: "Cash account",
  debt: "Debt",
  bill: "Bill",
  holding: "Holding"
};

export default function ImportReviewRow({
  item,
  onUpdate
}: {
  item: ReviewItem;
  onUpdate: (updated: ReviewItem) => void;
}) {
  const { data } = item;
  // Never let an inferred market value pass as cost basis — a holding
  // extracted without an explicit cost-basis figure stays excluded until
  // the user fills it in by hand.
  const blockedOnCostBasis = data.category === "holding" && data.costBasis === undefined;

  function set(field: keyof ExtractedDocumentItem, value: unknown) {
    onUpdate({ ...item, data: { ...data, [field]: value } });
  }

  return (
    <li className="import-review-row">
      <div className="import-review-header">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={item.included && !blockedOnCostBasis}
            disabled={blockedOnCostBasis}
            onChange={(e) => onUpdate({ ...item, included: e.target.checked })}
          />
          <strong>{CATEGORY_LABELS[data.category]}</strong>
        </label>
        <ConfidenceBadge confidence={data.confidence} />
        {item.matchType === "match" && (
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={item.action === "update"}
              onChange={(e) => onUpdate({ ...item, action: e.target.checked ? "update" : "add" })}
            />
            Update existing instead of adding new
          </label>
        )}
        {item.matchType === "ambiguous" && (
          <span className="import-review-warning">Multiple existing records share this name — adding as new.</span>
        )}
      </div>

      {data.category === "cash_account" && (
        <div className="form-grid">
          <label>
            Name
            <input value={data.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label>
            Type
            <select value={data.accountType ?? "checking"} onChange={(e) => set("accountType", e.target.value)}>
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
              value={data.amount ?? ""}
              onChange={(e) => set("amount", Number(e.target.value))}
            />
          </label>
        </div>
      )}

      {data.category === "debt" && (
        <div className="form-grid">
          <label>
            Name
            <input value={data.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label>
            Type
            <select value={data.debtType ?? "other"} onChange={(e) => set("debtType", e.target.value)}>
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
              value={data.amount ?? ""}
              onChange={(e) => set("amount", Number(e.target.value))}
            />
          </label>
          <label>
            Interest rate % (optional)
            <input
              type="number"
              step="any"
              value={data.interestRate ?? ""}
              onChange={(e) => set("interestRate", e.target.value === "" ? undefined : Number(e.target.value))}
            />
          </label>
          <label>
            Minimum payment (optional)
            <input
              type="number"
              step="any"
              value={data.minimumPayment ?? ""}
              onChange={(e) => set("minimumPayment", e.target.value === "" ? undefined : Number(e.target.value))}
            />
          </label>
        </div>
      )}

      {data.category === "bill" && (
        <div className="form-grid">
          <label>
            Name
            <input value={data.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label>
            Amount
            <input
              type="number"
              step="any"
              value={data.amount ?? ""}
              onChange={(e) => set("amount", Number(e.target.value))}
            />
          </label>
          <label>
            Due day of month
            <input
              type="number"
              min="1"
              max="31"
              value={data.dueDay ?? ""}
              onChange={(e) => set("dueDay", Number(e.target.value))}
            />
            <span className="import-review-warning">Recurrence isn&apos;t confirmed by a single statement — double-check this.</span>
          </label>
          <label>
            Category
            <select value={data.billCategory ?? ""} onChange={(e) => set("billCategory", e.target.value || undefined)}>
              <option value="">None</option>
              {BUDGET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={data.autopay ?? false} onChange={(e) => set("autopay", e.target.checked)} />
            On autopay
          </label>
        </div>
      )}

      {data.category === "holding" && (
        <div className="form-grid">
          <label>
            Symbol
            <input value={data.symbol ?? ""} onChange={(e) => set("symbol", e.target.value.toUpperCase())} />
          </label>
          <label>
            Shares
            <input
              type="number"
              step="any"
              value={data.shares ?? ""}
              onChange={(e) => set("shares", Number(e.target.value))}
            />
          </label>
          <label className={blockedOnCostBasis ? "field-review" : ""}>
            Cost basis (per share)
            <input
              type="number"
              step="any"
              value={data.costBasis ?? ""}
              onChange={(e) => set("costBasis", e.target.value === "" ? undefined : Number(e.target.value))}
            />
            {blockedOnCostBasis && (
              <span className="import-review-warning">
                Not found on the statement — fill this in to include this holding.
              </span>
            )}
          </label>
        </div>
      )}

      <p className="disclaimer import-review-evidence">&quot;{data.evidence}&quot;</p>
    </li>
  );
}
