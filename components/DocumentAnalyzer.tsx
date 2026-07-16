"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { saveReport } from "@/lib/reportsClient";
import { findExactNameMatch, findSymbolMatch, type MatchResult } from "@/lib/importMatch";
import type { ExtractedDocumentItem } from "@/lib/prompts";
import type { Plan } from "@/lib/profile";
import type { CashAccount } from "@/lib/cashAccounts";
import type { Debt } from "@/lib/debts";
import type { Bill } from "@/lib/bills";
import type { Holding } from "@/lib/portfolio";
import UsageBar from "@/components/UsageBar";
import ImportReviewRow, { type ReviewItem } from "@/components/document/ImportReviewRow";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const PDF_MAX_BYTES = 4 * 1024 * 1024;

function buildReviewItems(
  extracted: ExtractedDocumentItem[],
  existing: { cashAccounts: CashAccount[]; debts: Debt[]; bills: Bill[]; holdings: Holding[] }
): ReviewItem[] {
  return extracted.map((data, index) => {
    let match: MatchResult<{ id: string }>;
    if (data.category === "holding") {
      match = findSymbolMatch(existing.holdings, data.symbol);
    } else if (data.category === "cash_account") {
      match = findExactNameMatch(existing.cashAccounts, data.name);
    } else if (data.category === "debt") {
      match = findExactNameMatch(existing.debts, data.name);
    } else {
      match = findExactNameMatch(existing.bills, data.name);
    }
    return {
      key: `item-${index}`,
      data,
      included: true,
      action: match.type === "match" ? "update" : "add",
      targetId: match.type === "match" ? match.item.id : null,
      matchType: match.type
    };
  });
}

function buildImportRequestItem(item: ReviewItem) {
  const base = { action: item.action, targetId: item.targetId ?? undefined };
  const { data } = item;
  if (data.category === "cash_account") {
    return {
      ...base,
      category: "cash_account" as const,
      name: data.name?.trim() || "Untitled account",
      accountType: data.accountType ?? "other",
      balance: data.amount ?? 0
    };
  }
  if (data.category === "debt") {
    return {
      ...base,
      category: "debt" as const,
      name: data.name?.trim() || "Untitled debt",
      debtType: data.debtType ?? "other",
      balance: data.amount ?? 0,
      interestRate: data.interestRate,
      minimumPayment: data.minimumPayment
    };
  }
  if (data.category === "bill") {
    return {
      ...base,
      category: "bill" as const,
      name: data.name?.trim() || "Untitled bill",
      amount: data.amount ?? 0,
      dueDay: data.dueDay ?? 1,
      billCategory: data.billCategory,
      autopay: data.autopay
    };
  }
  return {
    ...base,
    category: "holding" as const,
    symbol: data.symbol?.trim() || "",
    shares: data.shares ?? 0,
    costBasis: data.costBasis ?? 0
  };
}

export default function DocumentAnalyzer({
  plan,
  maxChars,
  maxPages,
  uploadsUsed,
  uploadsLimit,
  existingCashAccounts,
  existingDebts,
  existingBills,
  existingHoldings
}: {
  plan: Plan;
  maxChars: number;
  maxPages: number;
  uploadsUsed: number;
  uploadsLimit: number;
  existingCashAccounts: CashAccount[];
  existingDebts: Debt[];
  existingBills: Bill[];
  existingHoldings: Holding[];
}) {
  const [text, setText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  const uploadsExhausted = uploadsUsed >= uploadsLimit;
  // ~1,800 characters/page — see lib/limits.ts CHARS_PER_PAGE, for the
  // TXT/CSV/pasted-text path only (a PDF is sent to Claude directly, no
  // char-count heuristic applies).
  const estimatedPages = Math.ceil(text.length / 1800);
  const maxPagesLabel = Number.isFinite(maxPages) ? String(maxPages) : "unlimited";

  async function readFile(file?: File) {
    if (!file) return;
    setError("");
    setPdfFile(null);

    if (file.type === "application/pdf") {
      if (file.size > PDF_MAX_BYTES) {
        setError(`PDF is too large. Upload a statement under ${Math.round(PDF_MAX_BYTES / (1024 * 1024))}MB.`);
        return;
      }
      setPdfFile(file);
      setText("");
      return;
    }

    if (!file.type.startsWith("text/") && !file.name.endsWith(".csv")) {
      setError("Upload a PDF, TXT, or CSV file, or paste text below.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("File is too large. Upload a file under 2 MB.");
      return;
    }
    const content = await file.text();
    setText(content.slice(0, maxChars));
  }

  async function analyze() {
    if (uploadsExhausted) {
      setError(`You've used all ${uploadsLimit} of your ${plan} plan's document uploads this month.`);
      return;
    }
    if (!pdfFile && text.trim().length < 30) {
      setError("Paste more financial information, or upload a statement, before analyzing.");
      return;
    }
    if (!pdfFile && text.length > maxChars) {
      setError(
        `Document is too long for your ${plan} plan (~${maxPagesLabel} pages). Trim it to under ${maxChars.toLocaleString()} characters, or upgrade.`
      );
      return;
    }
    setLoading(true);
    setError("");
    setItems([]);
    setImportMessage("");
    try {
      const formData = new FormData();
      if (pdfFile) {
        formData.append("file", pdfFile);
      } else {
        formData.append("text", text);
      }
      const response = await fetch("/api/documents/extract", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Extraction failed");
      setItems(
        buildReviewItems(data.items ?? [], {
          cashAccounts: existingCashAccounts,
          debts: existingDebts,
          bills: existingBills,
          holdings: existingHoldings
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    const toImport = items.filter((i) => i.included && !(i.data.category === "holding" && i.data.costBasis === undefined));
    if (toImport.length === 0) {
      setError("Select at least one item to import.");
      return;
    }
    setImporting(true);
    setError("");
    setImportMessage("");
    try {
      const response = await fetch("/api/documents/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: toImport.map(buildImportRequestItem) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import failed");
      const results = (data.results ?? []) as Array<{ ok: boolean }>;
      const succeeded = results.filter((r) => r.ok).length;
      const failed = results.length - succeeded;
      setImportMessage(
        failed > 0
          ? `Imported ${succeeded} of ${results.length} items — ${failed} failed. Check the failed items and try again.`
          : `Imported ${succeeded} item${succeeded === 1 ? "" : "s"}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage("");
    const result = await saveReport({
      title: `Document analysis — ${new Date().toLocaleDateString()}`,
      module: "document",
      input: { itemCount: items.length },
      output: JSON.stringify({ items: items.map((i) => i.data) })
    });
    setSaveMessage(result.error ? result.error : "Saved to your reports.");
    setSaving(false);
  }

  function clear() {
    setText("");
    setPdfFile(null);
    setItems([]);
    setError("");
    setImportMessage("");
  }

  return (
    <div className="panel">
      <h2>Financial Document Analyzer</h2>
      <p className="disclaimer" style={{ marginTop: 0 }}>
        Upload a bank or brokerage statement — Claude reads it directly and extracts line items you can review and
        import into your Accounts, Debts, Bills, and Portfolio. Nothing is saved to your accounts until you choose
        what to import below.
      </p>

      <UsageBar label="Document uploads this month" used={uploadsUsed} limit={uploadsLimit} />

      {uploadsExhausted && (
        <div className="notice upsell-notice">
          <Lock size={14} /> You&apos;ve used all your {plan} plan&apos;s document uploads this month.{" "}
          <Link href="/pricing" className="upsell-link">
            Upgrade for more
          </Link>
        </div>
      )}

      <div className="form-grid">
        <label className="full">
          Upload a PDF statement, or TXT/CSV (up to ~{maxPagesLabel} pages on the {plan} plan)
          <input
            type="file"
            accept=".pdf,.txt,.csv,application/pdf,text/plain,text/csv"
            onChange={(e) => readFile(e.target.files?.[0])}
            disabled={uploadsExhausted}
          />
        </label>
        {pdfFile ? (
          <p className="disclaimer full" style={{ marginTop: 0 }}>
            Selected: {pdfFile.name} ({(pdfFile.size / (1024 * 1024)).toFixed(1)} MB)
          </p>
        ) : (
          <label className="full">
            Or paste a financial statement, earnings transcript, or notes
            <textarea
              placeholder="Paste financial information here..."
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxChars))}
              disabled={uploadsExhausted}
            />
            <span className="disclaimer">
              ~{estimatedPages} page{estimatedPages === 1 ? "" : "s"} of {maxPagesLabel} max (estimated)
            </span>
          </label>
        )}
      </div>
      <div className="actions">
        <button className="primary" onClick={analyze} disabled={loading || uploadsExhausted}>
          {loading ? "Reading document..." : "Analyze document"}
        </button>
        <button className="secondary" onClick={clear}>
          Clear
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      {saveMessage && <div className="notice">{saveMessage}</div>}
      {importMessage && <div className="notice">{importMessage}</div>}

      {items.length > 0 && (
        <div className="import-review">
          <h3>Review extracted items</h3>
          <p className="disclaimer" style={{ marginTop: 0 }}>
            Edit anything that looks off before importing. Bills are always low-confidence — a statement shows
            transactions, not confirmed recurring obligations.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {items.map((item) => (
              <ImportReviewRow
                key={item.key}
                item={item}
                onUpdate={(updated) => setItems((current) => current.map((i) => (i.key === updated.key ? updated : i)))}
              />
            ))}
          </ul>
          <div className="actions">
            <button className="primary" onClick={handleImport} disabled={importing}>
              {importing ? "Importing..." : "Import selected"}
            </button>
            <button className="secondary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save report"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
