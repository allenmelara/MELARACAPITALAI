"use client";

import { useMemo, useState } from "react";
import { calculateRealEstateMetrics, type RealEstateInputs } from "@/lib/realEstate";
import { money, percent } from "@/lib/finance";
import { saveReport } from "@/lib/reportsClient";

const initial: RealEstateInputs = {
  purchasePrice: 400000,
  downPaymentPct: 0.25,
  closingCosts: 8000,
  interestRate: 0.065,
  loanTermYears: 30,
  grossRentalIncome: 42000,
  vacancyRate: 0.05,
  operatingExpenses: 14000,
  appreciationRate: 0.03
};

export default function RealEstateAnalyzer() {
  const [propertyName, setPropertyName] = useState("Example Property");
  const [inputs, setInputs] = useState(initial);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const metrics = useMemo(() => calculateRealEstateMetrics(inputs), [inputs]);

  function update(key: keyof RealEstateInputs, raw: string) {
    setInputs((current) => ({ ...current, [key]: Number(raw) || 0 }));
  }

  async function analyze() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "real_estate",
          payload: { propertyName, inputs, metrics }
        })
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
      title: propertyName,
      module: "real_estate",
      input: { propertyName, inputs },
      output: report
    });
    setSaveMessage(result.error ? result.error : "Saved to your reports.");
    setSaving(false);
  }

  return (
    <div className="panel">
      <h2>Real Estate Investment Lab</h2>
      <div className="form-grid">
        <label className="full">
          Property name
          <input value={propertyName} onChange={(e) => setPropertyName(e.target.value)} />
        </label>
        {[
          ["purchasePrice", "Purchase price"],
          ["closingCosts", "Closing costs"],
          ["grossRentalIncome", "Gross annual rental income"],
          ["operatingExpenses", "Annual operating expenses"]
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              value={inputs[key as keyof RealEstateInputs]}
              onChange={(e) => update(key as keyof RealEstateInputs, e.target.value)}
            />
          </label>
        ))}
        <label>
          Down payment %
          <input
            type="number"
            step="0.01"
            value={inputs.downPaymentPct}
            onChange={(e) => update("downPaymentPct", e.target.value)}
          />
        </label>
        <label>
          Interest rate
          <input
            type="number"
            step="0.001"
            value={inputs.interestRate}
            onChange={(e) => update("interestRate", e.target.value)}
          />
        </label>
        <label>
          Loan term (years)
          <input
            type="number"
            value={inputs.loanTermYears}
            onChange={(e) => update("loanTermYears", e.target.value)}
          />
        </label>
        <label>
          Vacancy rate
          <input
            type="number"
            step="0.01"
            value={inputs.vacancyRate}
            onChange={(e) => update("vacancyRate", e.target.value)}
          />
        </label>
        <label>
          Annual appreciation rate
          <input
            type="number"
            step="0.001"
            value={inputs.appreciationRate}
            onChange={(e) => update("appreciationRate", e.target.value)}
          />
        </label>
      </div>

      <div className="metrics">
        <div className="metric"><span>NOI</span><strong>{money(metrics.noi)}</strong></div>
        <div className="metric"><span>Cap rate</span><strong>{percent(metrics.capRate)}</strong></div>
        <div className="metric"><span>DSCR</span><strong>{metrics.dscr.toFixed(2)}x</strong></div>
        <div className="metric"><span>Cash-on-cash return</span><strong>{percent(metrics.cashOnCashReturn)}</strong></div>
        <div className="metric"><span>Monthly mortgage payment</span><strong>{money(metrics.monthlyMortgagePayment)}</strong></div>
        <div className="metric"><span>Total cash invested</span><strong>{money(metrics.totalCashInvested)}</strong></div>
        <div className="metric"><span>5-year projected equity</span><strong>{money(metrics.projectedEquity)}</strong></div>
        <div className="metric"><span>5-year total return</span><strong>{percent(metrics.fiveYearReturn)}</strong></div>
      </div>

      <div className="actions">
        <button className="primary" onClick={analyze} disabled={loading}>
          {loading ? "Analyzing..." : "Generate AI investment report"}
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
      <p className="disclaimer">
        Simplified educational model. Assumes flat rent and operating expenses
        over the holding period and does not account for taxes, selling
        costs, or financing fees.
      </p>
    </div>
  );
}
