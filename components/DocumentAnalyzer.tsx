"use client";

import { useState } from "react";
import { saveReport } from "@/lib/reportsClient";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TEXT_CHARS = 60_000;

export default function DocumentAnalyzer() {
  const [text, setText] = useState("");
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

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
    setText(content.slice(0, MAX_TEXT_CHARS));
  }

  async function analyze() {
    if (text.trim().length < 30) {
      setError("Paste more financial information before analyzing.");
      return;
    }
    if (text.length > MAX_TEXT_CHARS) {
      setError(`Document is too long. Trim it to under ${MAX_TEXT_CHARS.toLocaleString()} characters.`);
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
      <div className="form-grid">
        <label className="full">
          Upload TXT or CSV
          <input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={(e) => readFile(e.target.files?.[0])} />
        </label>
        <label className="full">
          Financial statement, earnings transcript, or notes
          <textarea
            placeholder="Paste financial information here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
      </div>
      <div className="actions">
        <button className="primary" onClick={analyze} disabled={loading}>
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
