"use client";

import { useMemo, useState } from "react";
import { calculateWealthMetrics, type WealthInputs } from "@/lib/wealth";
import { money, percent } from "@/lib/finance";
import { saveReport } from "@/lib/reportsClient";

const initial: WealthInputs = {
  monthlyIncome: 8000,
  monthlyExpenses: 5200,
  currentAssets: 120000,
  currentLiabilities: 20000,
  currentRetirementSavings: 60000,
  monthlyRetirementContribution: 800,
  expectedAnnualReturn: 0.07,
  yearsToRetirement: 30,
  emergencyFundMonths: 6,
  withdrawalRate: 0.04
};

export default function WealthPlanner() {
  const [planName, setPlanName] = useState("My wealth plan");
  const [inputs, setInputs] = useState(initial);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const metrics = useMemo(() => calculateWealthMetrics(inputs), [inputs]);

  function update(key: keyof WealthInputs, raw: string) {
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
          mode: "wealth",
          payload: { planName, inputs, metrics }
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
      title: planName,
      module: "wealth",
      input: { planName, inputs },
      output: report
    });
    setSaveMessage(result.error ? result.error : "Saved to your reports.");
    setSaving(false);
  }

  return (
    <div className="panel">
      <h2>Personal Wealth Planner</h2>
      <div className="form-grid">
        <label className="full">
          Plan name
          <input value={planName} onChange={(e) => setPlanName(e.target.value)} />
        </label>
        {[
          ["monthlyIncome", "Monthly income"],
          ["monthlyExpenses", "Monthly expenses"],
          ["currentAssets", "Current assets"],
          ["currentLiabilities", "Current liabilities"],
          ["currentRetirementSavings", "Current retirement savings"],
          ["monthlyRetirementContribution", "Monthly retirement contribution"]
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              value={inputs[key as keyof WealthInputs]}
              onChange={(e) => update(key as keyof WealthInputs, e.target.value)}
            />
          </label>
        ))}
        <label>
          Expected annual return
          <input
            type="number"
            step="0.001"
            value={inputs.expectedAnnualReturn}
            onChange={(e) => update("expectedAnnualReturn", e.target.value)}
          />
        </label>
        <label>
          Years to retirement
          <input
            type="number"
            value={inputs.yearsToRetirement}
            onChange={(e) => update("yearsToRetirement", e.target.value)}
          />
        </label>
        <label>
          Emergency fund (months)
          <input
            type="number"
            value={inputs.emergencyFundMonths}
            onChange={(e) => update("emergencyFundMonths", e.target.value)}
          />
        </label>
        <label>
          Retirement withdrawal rate
          <input
            type="number"
            step="0.001"
            value={inputs.withdrawalRate}
            onChange={(e) => update("withdrawalRate", e.target.value)}
          />
        </label>
      </div>

      <div className="metrics">
        <div className="metric"><span>Monthly cash flow</span><strong>{money(metrics.monthlyCashFlow)}</strong></div>
        <div className="metric"><span>Savings rate</span><strong>{percent(metrics.savingsRate)}</strong></div>
        <div className="metric"><span>Emergency fund target</span><strong>{money(metrics.emergencyFundTarget)}</strong></div>
        <div className="metric"><span>Current net worth</span><strong>{money(metrics.currentNetWorth)}</strong></div>
        <div className="metric"><span>5-year net worth projection</span><strong>{money(metrics.fiveYearNetWorthProjection)}</strong></div>
        <div className="metric"><span>Projected retirement balance</span><strong>{money(metrics.retirementBalance)}</strong></div>
        <div className="metric"><span>Sustainable annual retirement income</span><strong>{money(metrics.sustainableAnnualRetirementIncome)}</strong></div>
      </div>

      <div className="actions">
        <button className="primary" onClick={analyze} disabled={loading}>
          {loading ? "Analyzing..." : "Generate Report"}
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
        Simplified educational model. Assumes constant income, expenses, and
        rate of return, with no inflation, tax, or market-volatility modeling.
        Not individualized financial or retirement advice.
      </p>
    </div>
  );
}
