"use client";

import { useState } from "react";

export default function DocumentAnalyzer() {
  const [text, setText] = useState("");
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function readFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("text/") && !file.name.endsWith(".csv")) {
      setError("This MVP accepts TXT, CSV, or pasted text. Add a PDF parser before production.");
      return;
    }
    setText(await file.text());
  }

  async function analyze() {
    if (text.trim().length < 30) {
      setError("Paste more financial information before analyzing.");
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
      </div>
      {error && <div className="error">{error}</div>}
      {report && <div className="report">{report}</div>}
    </div>
  );
}
