"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, RefreshCw, RotateCcw } from "lucide-react";
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
import ReportChat from "@/components/ReportChat";
import CompanySearch, { type SelectedCompany } from "@/components/company/CompanySearch";
import WorkflowStepper, { type WorkflowStep } from "@/components/company/WorkflowStepper";
import SourceBadge, { type FieldSource } from "@/components/company/SourceBadge";
import FinancialStatements from "@/components/company/FinancialStatements";
import ImportProgress from "@/components/company/ImportProgress";
import type { FinancialStatements as StatementsData, Filing } from "@/lib/secEdgar";
import { saveReport } from "@/lib/reportsClient";

type Comparable = ComparableMetrics & { ticker: string; name: string };

type CompanyIdentity = {
  ticker: string;
  name: string;
  exchange: string | null;
  industry: string | null;
  logo: string | null;
};

const STEPS: WorkflowStep[] = [
  { id: 1, label: "Company", hint: "Select the filer" },
  { id: 2, label: "Financials", hint: "SEC data & comps" },
  { id: 3, label: "Valuation", hint: "DCF & assumptions" },
  { id: 4, label: "Report", hint: "Generate & discuss" }
];

const FINANCIAL_FIELDS: Array<{ key: keyof CompanyInputs; label: string }> = [
  { key: "revenue", label: "Revenue" },
  { key: "ebitda", label: "EBITDA" },
  { key: "netIncome", label: "Net income" },
  { key: "cash", label: "Cash & equivalents" },
  { key: "debt", label: "Total debt" },
  { key: "shares", label: "Shares outstanding" },
  { key: "currentPrice", label: "Current share price" }
];

const ASSUMPTION_FIELDS: Array<{ key: keyof CompanyInputs; label: string }> = [
  { key: "growthRate", label: "Annual growth rate" },
  { key: "discountRate", label: "Discount rate (WACC)" },
  { key: "terminalGrowthRate", label: "Terminal growth rate" },
  { key: "taxRate", label: "Tax rate" },
  { key: "depreciationPct", label: "D&A (% of revenue)" },
  { key: "capexPct", label: "Capex (% of revenue)" },
  { key: "nwcChangePct", label: "Δ Net working capital (% of revenue)" }
];

const initialInputs: CompanyInputs = {
  revenue: 0,
  ebitda: 0,
  netIncome: 0,
  cash: 0,
  debt: 0,
  shares: 0,
  currentPrice: 0,
  growthRate: 0.08,
  discountRate: 0.1,
  terminalGrowthRate: 0.025,
  taxRate: 0.21,
  depreciationPct: 0.03,
  capexPct: 0.04,
  nwcChangePct: 0.01
};

export default function CompanyAnalyzer() {
  const [step, setStep] = useState(1);
  const [furthest, setFurthest] = useState(1);

  const [identity, setIdentity] = useState<CompanyIdentity | null>(null);
  const [inputs, setInputs] = useState<CompanyInputs>(initialInputs);
  const [sourceNotes, setSourceNotes] = useState<Record<string, FieldSource>>({});
  const [statements, setStatements] = useState<StatementsData | null>(null);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [dataMessage, setDataMessage] = useState("");

  const [compsInput, setCompsInput] = useState("");
  const [comparables, setComparables] = useState<Comparable[]>([]);
  const [compsLoading, setCompsLoading] = useState(false);
  const [compsError, setCompsError] = useState("");

  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [savedReportId, setSavedReportId] = useState<string | null>(null);

  const metrics = useMemo(() => calculateCompanyMetrics(inputs), [inputs]);
  const compsAverageEvToEbitda = useMemo(() => averageEvToEbitda(comparables), [comparables]);
  const structuredReport = useMemo(
    () => (report ? parseStructuredCompanyReport(report) : null),
    [report]
  );

  function goTo(target: number) {
    setStep(target);
    setFurthest((f) => Math.max(f, target));
  }

  function update(key: keyof CompanyInputs, raw: string) {
    setInputs((current) => ({ ...current, [key]: Number(raw) || 0 }));
    // A hand-edited value is no longer "as reported" — drop its provenance badge.
    setSourceNotes((current) => ({ ...current, [key]: undefined }));
  }

  async function loadCompany(selected: SelectedCompany) {
    // Reset any downstream work from a previous company.
    setReport("");
    setSavedReportId(null);
    setSaveMessage("");
    setComparables([]);
    setCompsInput("");
    setError("");
    setIdentity({ ticker: selected.ticker, name: selected.name, exchange: null, industry: null, logo: null });
    setStatements(null);
    setFilings([]);
    setDataLoading(true);
    setDataError("");
    setDataMessage("");

    try {
      const response = await fetch(`/api/company-lookup?ticker=${encodeURIComponent(selected.ticker)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Lookup failed");

      setInputs((current) => ({ ...current, ...data.inputs }));
      setSourceNotes(data.sourceNotes ?? {});
      setStatements(data.statements ?? null);
      setFilings(data.filings ?? []);
      setIdentity({
        ticker: data.company.ticker,
        name: data.company.name,
        exchange: data.company.exchange ?? null,
        industry: data.company.industry ?? null,
        logo: data.company.logo ?? null
      });

      const notes = (data.sourceNotes ?? {}) as Record<string, string>;
      const missing = Object.keys(notes).filter((field) => notes[field] === "not_found");
      const filled = Object.keys(notes).length - missing.length;
      setDataMessage(
        `Pulled ${filled} field${filled === 1 ? "" : "s"} from ${data.company.name}'s latest SEC filings and live price.` +
          (missing.length ? ` ${missing.length} not found in filings — review the highlighted fields.` : "")
      );
    } catch (err) {
      setDataError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setDataLoading(false);
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
    if (!identity) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "company",
          payload: { company: identity.name, inputs, metrics, comparables }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");
      setReport(data.report);
      setSavedReportId(null);
      setSaveMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!identity) return;
    setSaving(true);
    setSaveMessage("");
    const result = await saveReport({
      title: identity.name,
      module: "company",
      input: { company: identity.name, ticker: identity.ticker, inputs, comparables },
      output: report
    });
    if (result.error) {
      setSaveMessage(result.error);
    } else {
      setSaveMessage("Saved to your reports. Ask a follow-up question below.");
      if (result.id) setSavedReportId(result.id);
    }
    setSaving(false);
  }

  function resetAll() {
    setStep(1);
    setFurthest(1);
    setIdentity(null);
    setInputs(initialInputs);
    setSourceNotes({});
    setStatements(null);
    setFilings([]);
    setDataError("");
    setDataMessage("");
    setComparables([]);
    setCompsInput("");
    setReport("");
    setSavedReportId(null);
    setSaveMessage("");
    setError("");
  }

  const canLeaveStep1 = Boolean(identity) && !dataLoading;

  return (
    <div className="workflow">
      <div className="workflow-head">
        <div>
          <h1 className="workflow-title">Company Research</h1>
          <p className="workflow-sub">
            A guided institutional workflow — from company selection to a full investment report.
          </p>
        </div>
        {identity && (
          <button className="secondary workflow-reset" onClick={resetAll}>
            <RotateCcw size={15} /> New analysis
          </button>
        )}
      </div>

      <WorkflowStepper steps={STEPS} current={step} furthest={furthest} onJump={goTo} />

      {identity && step > 1 && <IdentityBar identity={identity} />}

      <div className="panel workflow-stage">
        {step === 1 && (
          <StepCompany
            identity={identity}
            dataLoading={dataLoading}
            dataError={dataError}
            onSelect={loadCompany}
          />
        )}

        {step === 2 && (
          <StepFinancials
            inputs={inputs}
            sourceNotes={sourceNotes}
            statements={statements}
            filings={filings}
            dataLoading={dataLoading}
            dataError={dataError}
            dataMessage={dataMessage}
            onUpdate={update}
            onRefetch={() => identity && loadCompany({ ticker: identity.ticker, name: identity.name })}
            compsInput={compsInput}
            setCompsInput={setCompsInput}
            comparables={comparables}
            compsLoading={compsLoading}
            compsError={compsError}
            onFetchComparables={fetchComparables}
          />
        )}

        {step === 3 && (
          <StepValuation
            inputs={inputs}
            sourceNotes={sourceNotes}
            metrics={metrics}
            comparables={comparables}
            compsAverageEvToEbitda={compsAverageEvToEbitda}
            companyName={identity?.name ?? ""}
            onUpdate={update}
          />
        )}

        {step === 4 && (
          <StepReport
            loading={loading}
            error={error}
            report={report}
            structuredReport={structuredReport}
            saving={saving}
            saveMessage={saveMessage}
            savedReportId={savedReportId}
            onAnalyze={analyze}
            onSave={handleSave}
          />
        )}

        <div className="workflow-nav">
          {step > 1 ? (
            <button className="secondary" onClick={() => goTo(step - 1)}>
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <span />
          )}
          {step < 4 && (
            <button
              className="primary"
              onClick={() => goTo(step + 1)}
              disabled={step === 1 && !canLeaveStep1}
            >
              {step === 1 ? "Continue to financials" : step === 2 ? "Continue to valuation" : "Continue to report"}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function IdentityBar({ identity }: { identity: CompanyIdentity }) {
  return (
    <div className="identity-bar">
      {identity.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={identity.logo} alt="" className="identity-logo" />
      ) : (
        <span className="identity-logo identity-logo-fallback">{identity.ticker.slice(0, 1)}</span>
      )}
      <div className="identity-meta">
        <strong className="identity-name">{identity.name}</strong>
        <span className="identity-tags">
          <span className="identity-ticker">{identity.ticker}</span>
          {identity.exchange && <span>{identity.exchange}</span>}
          {identity.industry && <span>{identity.industry}</span>}
        </span>
      </div>
    </div>
  );
}

function StepCompany({
  identity,
  dataLoading,
  dataError,
  onSelect
}: {
  identity: CompanyIdentity | null;
  dataLoading: boolean;
  dataError: string;
  onSelect: (company: SelectedCompany) => void;
}) {
  return (
    <div className="step-body">
      <div className="step-heading">
        <h2>Select a company</h2>
        <p className="step-lede">
          Search by name or enter a ticker. We&apos;ll resolve it to the SEC filer and pull its latest
          financials automatically.
        </p>
      </div>

      <CompanySearch onSelect={onSelect} />

      {identity && (
        <div className={`selected-company ${dataLoading ? "is-loading" : ""}`}>
          {identity.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={identity.logo} alt="" className="identity-logo" />
          ) : (
            <span className="identity-logo identity-logo-fallback">{identity.ticker.slice(0, 1)}</span>
          )}
          <div className="identity-meta">
            <strong className="identity-name">{identity.name}</strong>
            <span className="identity-tags">
              <span className="identity-ticker">{identity.ticker}</span>
              {identity.exchange && <span>{identity.exchange}</span>}
              {identity.industry && <span>{identity.industry}</span>}
            </span>
          </div>
          <span className="selected-company-status">
            {dataLoading ? "Loading SEC filings…" : dataError ? "Loaded with warnings" : "Ready"}
          </span>
        </div>
      )}
      {dataError && (
        <div className="error">
          {dataError} — you can still continue and enter the financials manually.
        </div>
      )}
    </div>
  );
}

function StepFinancials({
  inputs,
  sourceNotes,
  statements,
  filings,
  dataLoading,
  dataError,
  dataMessage,
  onUpdate,
  onRefetch,
  compsInput,
  setCompsInput,
  comparables,
  compsLoading,
  compsError,
  onFetchComparables
}: {
  inputs: CompanyInputs;
  sourceNotes: Record<string, FieldSource>;
  statements: StatementsData | null;
  filings: Filing[];
  dataLoading: boolean;
  dataError: string;
  dataMessage: string;
  onUpdate: (key: keyof CompanyInputs, raw: string) => void;
  onRefetch: () => void;
  compsInput: string;
  setCompsInput: (v: string) => void;
  comparables: Comparable[];
  compsLoading: boolean;
  compsError: string;
  onFetchComparables: () => void;
}) {
  return (
    <div className="step-body">
      <div className="step-heading">
        <div>
          <h2>Financial data</h2>
          <p className="step-lede">
            Automatically imported from SEC filings — statements, filing dates, and headline figures.
            Each key input is tagged with its source; review anything marked for manual entry.
          </p>
        </div>
        <button className="secondary step-refetch" onClick={onRefetch} disabled={dataLoading}>
          <RefreshCw size={15} className={dataLoading ? "spin" : ""} /> {dataLoading ? "Fetching…" : "Re-fetch"}
        </button>
      </div>

      {dataLoading && <ImportProgress done={false} />}
      {dataMessage && !dataError && !dataLoading && <div className="notice">{dataMessage}</div>}
      {dataError && <div className="error">{dataError}</div>}

      <h3 className="subsection-title">Key inputs</h3>
      <div className="form-grid">
        {FINANCIAL_FIELDS.map(({ key, label }) => (
          <label key={key} className={sourceNotes[key] === "not_found" ? "field-review" : ""}>
            <span className="field-label">
              {label}
              <SourceBadge status={sourceNotes[key]} />
            </span>
            <input
              type="number"
              value={inputs[key]}
              onChange={(e) => onUpdate(key, e.target.value)}
            />
          </label>
        ))}
      </div>

      {statements && !dataLoading && (
        <div className="statements-block">
          <h3 className="subsection-title">Financial statements</h3>
          <FinancialStatements statements={statements} filings={filings} />
        </div>
      )}

      <div className="comps-block">
        <h3 className="subsection-title">Comparable companies</h3>
        <p className="step-lede">
          Optional. Add up to four peers to benchmark valuation multiples.
        </p>
        <div className="autofill-row">
          <label>
            <span className="field-label">Peer tickers</span>
            <input
              placeholder="MSFT, GOOGL, META"
              value={compsInput}
              onChange={(e) => setCompsInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onFetchComparables()}
            />
          </label>
          <button className="secondary" onClick={onFetchComparables} disabled={compsLoading}>
            {compsLoading ? "Fetching…" : "Fetch comparables"}
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
      </div>
    </div>
  );
}

function StepValuation({
  inputs,
  sourceNotes,
  metrics,
  comparables,
  compsAverageEvToEbitda,
  companyName,
  onUpdate
}: {
  inputs: CompanyInputs;
  sourceNotes: Record<string, FieldSource>;
  metrics: ReturnType<typeof calculateCompanyMetrics>;
  comparables: Comparable[];
  compsAverageEvToEbitda: number | null;
  companyName: string;
  onUpdate: (key: keyof CompanyInputs, raw: string) => void;
}) {
  return (
    <div className="step-body">
      <div className="step-heading">
        <h2>Valuation &amp; assumptions</h2>
        <p className="step-lede">
          Tune the DCF drivers below — the implied value and multiples update live.
        </p>
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

      <h3 className="subsection-title">Model assumptions</h3>
      <div className="form-grid">
        {ASSUMPTION_FIELDS.map(({ key, label }) => (
          <label key={key}>
            <span className="field-label">
              {label}
              <SourceBadge status={sourceNotes[key]} />
            </span>
            <input
              type="number"
              step="0.001"
              value={inputs[key]}
              onChange={(e) => onUpdate(key, e.target.value)}
            />
          </label>
        ))}
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

      <CompanyCharts companyName={companyName} metrics={metrics} comparables={comparables} />

      <p className="disclaimer">
        Simplified educational model. The 5-year DCF projects unlevered free cash flow (EBITDA at
        today&apos;s margin, less D&amp;A, tax-effected, plus D&amp;A back, less capex and
        working-capital changes) using flat assumptions each year. Not a substitute for a full
        three-statement model.
      </p>
    </div>
  );
}

function StepReport({
  loading,
  error,
  report,
  structuredReport,
  saving,
  saveMessage,
  savedReportId,
  onAnalyze,
  onSave
}: {
  loading: boolean;
  error: string;
  report: string;
  structuredReport: ReturnType<typeof parseStructuredCompanyReport>;
  saving: boolean;
  saveMessage: string;
  savedReportId: string | null;
  onAnalyze: () => void;
  onSave: () => void;
}) {
  return (
    <div className="step-body">
      <div className="step-heading">
        <h2>Investment report</h2>
        <p className="step-lede">
          Generate an AI investment-committee report grounded in the data and assumptions above, then
          save it and ask follow-up questions.
        </p>
      </div>

      <div className="actions">
        <button className="primary" onClick={onAnalyze} disabled={loading}>
          {loading ? "Analyzing…" : report ? "Regenerate report" : "Generate report"}
        </button>
        {report && (
          <button className="secondary" onClick={onSave} disabled={saving || Boolean(savedReportId)}>
            {saving ? "Saving…" : savedReportId ? "Saved" : "Save report"}
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

      {savedReportId && <ReportChat reportId={savedReportId} module="company" />}
    </div>
  );
}
