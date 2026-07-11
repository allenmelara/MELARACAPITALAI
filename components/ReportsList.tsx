"use client";

import { useState } from "react";
import type { Report } from "@/lib/reports";
import { parseStructuredCompanyReport } from "@/lib/structuredReport";
import StructuredReport from "@/components/StructuredReport";
import ReportChat from "@/components/ReportChat";

export default function ReportsList({ initialReports }: { initialReports: Report[] }) {
  const [reports, setReports] = useState(initialReports);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function rename(id: string, currentTitle: string) {
    const title = window.prompt("Rename report", currentTitle);
    if (!title || title === currentTitle) return;
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to rename report.");
      } else {
        setReports((current) => current.map((r) => (r.id === id ? { ...r, title } : r)));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this report? This can't be undone.")) return;
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to delete report.");
      } else {
        setReports((current) => current.filter((r) => r.id !== id));
      }
    } finally {
      setBusyId(null);
    }
  }

  if (reports.length === 0) {
    return (
      <div className="panel">
        No saved reports yet. Generate one in the workspace and save it.
      </div>
    );
  }

  return (
    <div className="panel">
      {error && <div className="error">{error}</div>}
      <ul className="report-list">
        {reports.map((r) => (
          <li key={r.id} className="report-row">
            <button
              className="report-row-main"
              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
            >
              <span className="report-title">{r.title}</span>
              <span className="report-meta">
                {r.module.replace("_", " ")} · {new Date(r.created_at).toLocaleString()}
              </span>
            </button>
            <div className="report-row-actions">
              <a className="secondary" href={`/api/reports/${r.id}/export/pdf`}>
                Download PDF
              </a>
              <button className="secondary" disabled={busyId === r.id} onClick={() => rename(r.id, r.title)}>
                Rename
              </button>
              <button className="secondary" disabled={busyId === r.id} onClick={() => remove(r.id)}>
                Delete
              </button>
            </div>
            {expandedId === r.id && <ExpandedReport report={r} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExpandedReport({ report }: { report: Report }) {
  const structured = parseStructuredCompanyReport(report.output);
  return (
    <div className="expanded-report">
      {structured ? <StructuredReport data={structured} /> : <div className="report">{report.output}</div>}
      <ReportChat reportId={report.id} module={report.module} />
    </div>
  );
}
