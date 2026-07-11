"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { saveReport } from "@/lib/reportsClient";
import type { Plan } from "@/lib/profile";
import UsageBar from "@/components/UsageBar";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

export default function DocumentAnalyzer({
  plan,
  maxChars,
  maxPages,
  uploadsUsed,
  uploadsLimit
}: {
  plan: Plan;
  maxChars: number;
  maxPages: number;
  uploadsUsed: number;
  uploadsLimit: number;
}) {
  const [text, setText] = useState("");
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const uploadsExhausted = uploadsUsed >= uploadsLimit;
  // ~1,800 characters/page — see lib/limits.ts CHARS_PER_PAGE. There's no
  // real PDF/page parsing yet, so this is an estimate shown for orientation.
  const estimatedPages = Math.ceil(text.length / 1800);
  const maxPagesLabel = Number.isFinite(maxPages) ? String(maxPages) : "unlimited";

  async function readFile(file?: File) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("text/") && !file.name.endsWith(".csv")) {
      setError("This MVP accepts TXT, CSV, or pasted text. Add a PDF parser before production.");
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
    if (text.trim().length < 30) {
      setError("Paste more financial information before analyzing.");
      return;
    }
    if (text.length > maxChars) {
      setError(
        `Document is too long for your ${plan} plan (~${maxPagesLabel} pages). Trim it to under ${maxChars.toLocaleString()} characters, or upgrade.`
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "document", payload: text })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage("");
    const result = await saveReport({
      title: `Document analysis — ${new Date().toLocaleDateString()}`,
      module: "document",
      input: { text },
      output: report
    });
    setSaveMessage(result.error ? result.error : "Saved to your reports.");
    setSaving(false);
  }

  return (
    <div className="panel">
      <h2>Financial Document Analyzer</h2>

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
          Upload TXT or CSV (up to ~{maxPagesLabel} pages on the {plan} plan)
          <input
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            onChange={(e) => readFile(e.target.files?.[0])}
            disabled={uploadsExhausted}
          />
        </label>
        <label className="full">
          Financial statement, earnings transcript, or notes
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
      </div>
      <div className="actions">
        <button className="primary" onClick={analyze} disabled={loading || uploadsExhausted}>
          {loading ? "Reading document..." : "Analyze document"}
        </button>
        <button className="secondary" onClick={() => { setText(""); setReport(""); }}>
          Clear
        </button>
        {report && (
          <button className="secondary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save report"}
          </button>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      {saveMessage && <div className="notice">{saveMessage}</div>}
      {report && <div className="report">{report}</div>}
    </div>
  );
}
