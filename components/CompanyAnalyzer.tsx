"use client";

import { useMemo, useState } from "react";
import {
  calculateCompanyMetrics,
  money,
  percent,
  type CompanyInputs
} from "@/lib/finance";

const initial: CompanyInputs = {
  revenue: 100000000,
  ebitda: 18000000,
  netIncome: 9000000,
  cash: 12000000,
  debt: 25000000,
  shares: 10000000,
  currentPrice: 12,
  growthRate: 0.08,
  discountRate: 0.1,
  terminalGrowthRate: 0.025
};

export default function CompanyAnalyzer() {
  const [company, setCompany] = useState("Example Company");
  const [inputs, setInputs] = useState(initial);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const metrics = useMemo(() => calculateCompanyMetrics(inputs), [inputs]);

  function update(key: keyof CompanyInputs, raw: string) {
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
          mode: "company",
          payload: { company, inputs, metrics }
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

  return (
    <div className="panel">
      <h2>Company Valuation Lab</h2>
      <div className="form-grid">
        <label className="full">
          Company name
          <input value={company} onChange={(e) => setCompany(e.target.value)} />
        </label>
        {[
          ["revenue", "Revenue"],
          ["ebitda", "EBITDA"],
          ["netIncome", "Net income"],
          ["cash", "Cash"],
          ["debt", "Debt"],
          ["shares", "Shares outstanding"],
          ["currentPrice", "Current share price"]
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              value={inputs[key as keyof CompanyInputs]}
              onChange={(e) => update(key as keyof CompanyInputs, e.target.value)}
            />
          </label>
        ))}
        <label>
          Annual growth rate
          <input
            type="number"
            step="0.001"
            value={inputs.growthRate}
            onChange={(e) => update("growthRate", e.target.value)}
          />
        </label>
        <label>
          Discount rate
          <input
            type="number"
            step="0.001"
            value={inputs.discountRate}
            onChange={(e) => update("discountRate", e.target.value)}
          />
        </label>
        <label>
          Terminal growth rate
          <input
            type="number"
            step="0.001"
            value={inputs.terminalGrowthRate}
            onChange={(e) => update("terminalGrowthRate", e.target.value)}
          />
        </label>
      </div>

      <div className="metrics">
        <div className="metric"><span>Enterprise value</span><strong>{money(metrics.enterpriseValue)}</strong></div>
        <div className="metric"><span>EV / EBITDA</span><strong>{metrics.evToEbitda.toFixed(1)}x</strong></div>
        <div className="metric"><span>EBITDA margin</span><strong>{percent(metrics.ebitdaMargin)}</strong></div>
        <div className="metric"><span>DCF implied price</span><strong>{money(metrics.impliedSharePrice)}</strong></div>
      </div>

      <div className="actions">
        <button className="primary" onClick={analyze} disabled={loading}>
          {loading ? "Analyzing..." : "Generate AI investment report"}
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      {report && <div className="report">{report}</div>}
      <p className="disclaimer">
        Simplified educational model. Net income is used as a rough cash-flow
        proxy in this MVP and should be replaced with unlevered free cash flow
        before production use.
      </p>
    </div>
  );
}
