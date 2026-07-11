"use client";

import { useMemo, useState } from "react";
import {
  calculateCompanyMetrics,
  money,
  percent,
  type CompanyInputs
} from "@/lib/finance";
import { calculateComparableMetrics, averageEvToEbitda, type ComparableMetrics } from "@/lib/comparables";
import { parseStructuredCompanyReport } from "@/lib/structuredReport";
import StructuredReport from "@/components/StructuredReport";
import CompanyCharts from "@/components/CompanyCharts";
import { saveReport } from "@/lib/reportsClient";

type Comparable = ComparableMetrics & { ticker: string; name: string };

const FIELD_LABELS: Record<keyof CompanyInputs, string> = {
  revenue: "Revenue",
  ebitda: "EBITDA",
  netIncome: "Net income",
  cash: "Cash",
  debt: "Debt",
  shares: "Shares outstanding",
  currentPrice: "Current share price",
  growthRate: "Growth rate",
  discountRate: "Discount rate",
  terminalGrowthRate: "Terminal growth rate",
  taxRate: "Tax rate",
  depreciationPct: "Depreciation & amortization %",
  capexPct: "Capital expenditures %",
  nwcChangePct: "Change in net working capital %"
};

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
  terminalGrowthRate: 0.025,
  taxRate: 0.21,
  depreciationPct: 0.03,
  capexPct: 0.04,
  nwcChangePct: 0.01
};

export default function CompanyAnalyzer() {
  const [company, setCompany] = useState("Example Company");
  const [inputs, setInputs] = useState(initial);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [ticker, setTicker] = useState("");
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [autofillMessage, setAutofillMessage] = useState("");
  const [autofillError, setAutofillError] = useState("");
  const [compsInput, setCompsInput] = useState("");
  const [comparables, setComparables] = useState<Comparable[]>([]);
  const [compsLoading, setCompsLoading] = useState(false);
  const [compsError, setCompsError] = useState("");

  const metrics = useMemo(() => calculateCompanyMetrics(inputs), [inputs]);
  const compsAverageEvToEbitda = useMemo(() => averageEvToEbitda(comparables), [comparables]);
  const structuredReport = useMemo(
    () => (report ? parseStructuredCompanyReport(report) : null),
    [report]
  );

  function update(key: keyof CompanyInputs, raw: string) {
    setInputs((current) => ({ ...current, [key]: Number(raw) || 0 }));
  }

  async function autofill() {
    if (!ticker.trim()) {
      setAutofillError("Enter a ticker symbol first.");
      return;
    }
    setAutofillLoading(true);
    setAutofillError("");
    setAutofillMessage("");
    try {
      const response = await fetch(`/api/company-lookup?ticker=${encodeURIComponent(ticker.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Lookup failed");

      setInputs((current) => ({ ...current, ...data.inputs }));
      setCompany(data.company.name);

      const notes = data.sourceNotes as Record<string, string>;
      const filled = Object.keys(notes).filter((field) => notes[field] !== "not_found");
      const missing = Object.keys(notes).filter((field) => notes[field] === "not_found");
      const label = (field: string) => FIELD_LABELS[field as keyof CompanyInputs] ?? field;

      setAutofillMessage(
        `Autofilled ${filled.length} field${filled.length === 1 ? "" : "s"} from ${data.company.name} (${data.company.ticker})'s SEC filings and live price.` +
          (missing.length
            ? ` Not found in filings, please check: ${missing.map(label).join(", ")}.`
            : "")
      );
    } catch (err) {
      setAutofillError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setAutofillLoading(false);
    }
  }

  async function fetchComparables() {
    const tickers = compsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (tickers.length === 0) {
      setCompsError("Enter 1-4 comma-separated ticker symbols.");
      return;
    }
    setCompsLoading(true);
    setCompsError("");
    try {
      const results = await Promise.all(
        tickers.map(async (t) => {
          const response = await fetch(`/api/company-lookup?ticker=${encodeURIComponent(t)}`);
          const data = await response.json();
          if (!response.ok) throw new Error(`${t}: ${data.error || "lookup failed"}`);
          return {
            ticker: data.company.ticker as string,
            name: data.company.name as string,
            ...calculateComparableMetrics(data.inputs)
          };
        })
      );
      setComparables(results);
    } catch (err) {
      setCompsError(err instanceof Error ? err.message : "Failed to fetch comparables");
    } finally {
      setCompsLoading(false);
    }
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
          payload: { company, inputs, metrics, comparables }
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
      title: company,
      module: "company",
      input: { company, inputs, comparables },
      output: report
    });
    setSaveMessage(result.error ? result.error : "Saved to your reports.");
    setSaving(false);
  }

  return (
    <div className="panel">
      <h2>Company Valuation Lab</h2>

      <div className="autofill-row">
        <label>
          Ticker
          <input
            placeholder="AAPL"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && autofill()}
          />
        </label>
        <button className="secondary" onClick={autofill} disabled={autofillLoading}>
          {autofillLoading ? "Looking up..." : "Autofill from SEC filings"}
        </button>
      </div>
      {autofillError && <div className="error">{autofillError}</div>}
      {autofillMessage && <div className="notice">{autofillMessage}</div>}

      <div className="autofill-row">
        <label>
          Comparable companies
          <input
            placeholder="MSFT, GOOGL, META"
            value={compsInput}
            onChange={(e) => setCompsInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchComparables()}
          />
        </label>
        <button className="secondary" onClick={fetchComparables} disabled={compsLoading}>
          {compsLoading ? "Fetching..." : "Fetch comparables"}
        </button>
      </div>
      {compsError && <div className="error">{compsError}</div>}
      {comparables.length > 0 && (
        <div className="comps-table">
          <div className="comps-row comps-header">
            <span>Ticker</span>
            <span>EV / EBITDA</span>
            <span>P/E</span>
            <span>EBITDA margin</span>
          </div>
          {comparables.map((c) => (
            <div className="comps-row" key={c.ticker}>
              <span>{c.ticker}</span>
              <span>{c.evToEbitda !== null ? `${c.evToEbitda.toFixed(1)}x` : "—"}</span>
              <span>{c.peRatio !== null ? `${c.peRatio.toFixed(1)}x` : "—"}</span>
              <span>{c.ebitdaMargin !== null ? percent(c.ebitdaMargin) : "—"}</span>
            </div>
          ))}
        </div>
      )}

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
        <label>
          Tax rate
          <input
            type="number"
            step="0.001"
            value={inputs.taxRate}
            onChange={(e) => update("taxRate", e.target.value)}
          />
        </label>
        <label>
          Depreciation &amp; amortization (% of revenue)
          <input
            type="number"
            step="0.001"
            value={inputs.depreciationPct}
            onChange={(e) => update("depreciationPct", e.target.value)}
          />
        </label>
        <label>
          Capital expenditures (% of revenue)
          <input
            type="number"
            step="0.001"
            value={inputs.capexPct}
            onChange={(e) => update("capexPct", e.target.value)}
          />
        </label>
        <label>
          Change in net working capital (% of revenue)
          <input
            type="number"
            step="0.001"
            value={inputs.nwcChangePct}
            onChange={(e) => update("nwcChangePct", e.target.value)}
          />
        </label>
      </div>

      <div className={`verdict-card ${metrics.upside >= 0 ? "verdict-up" : "verdict-down"}`}>
        <div>
          <span className="verdict-label">DCF implied price</span>
          <strong className="verdict-price">{money(metrics.impliedSharePrice)}</strong>
        </div>
        <div className="verdict-delta">
          <span>{metrics.upside >= 0 ? "Upside" : "Downside"}</span>
          <strong>{percent(Math.abs(metrics.upside))}</strong>
          <span className="verdict-vs">vs. current price {money(inputs.currentPrice)}</span>
        </div>
      </div>

      <div className="metrics">
        <div className="metric"><span>Enterprise value</span><strong>{money(metrics.enterpriseValue)}</strong></div>
        <div className="metric"><span>DCF equity value</span><strong>{money(metrics.dcfEquityValue)}</strong></div>
        <div className="metric"><span>EV / EBITDA</span><strong>{metrics.evToEbitda.toFixed(1)}x</strong></div>
        <div className="metric"><span>P/E ratio</span><strong>{metrics.priceToEarnings.toFixed(1)}x</strong></div>
        <div className="metric"><span>EBITDA margin</span><strong>{percent(metrics.ebitdaMargin)}</strong></div>
        <div className="metric"><span>Net margin</span><strong>{percent(metrics.netMargin)}</strong></div>
        {compsAverageEvToEbitda !== null && (
          <div className="metric"><span>Comps avg EV/EBITDA</span><strong>{compsAverageEvToEbitda.toFixed(1)}x</strong></div>
        )}
        <div className="metric">
          <span>Upside / downside</span>
          <strong className={metrics.upside >= 0 ? "text-up" : "text-down"}>{percent(metrics.upside)}</strong>
        </div>
      </div>

      <CompanyCharts companyName={company} metrics={metrics} comparables={comparables} />

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
      {report &&
        (structuredReport ? (
          <StructuredReport data={structuredReport} />
        ) : (
          <div className="report">{report}</div>
        ))}
      <p className="disclaimer">
        Simplified educational model. The 5-year DCF projects unlevered free
        cash flow (EBITDA at today&apos;s margin, less D&amp;A, tax-effected,
        plus D&amp;A back, less capex and working-capital changes) using flat
        assumptions each year. Not a substitute for a full three-statement
        model.
      </p>
    </div>
  );
}
