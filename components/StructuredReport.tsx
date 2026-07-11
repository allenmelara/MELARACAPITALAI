import type { StructuredCompanyReport } from "@/lib/prompts";

export default function StructuredReport({ data }: { data: StructuredCompanyReport }) {
  return (
    <div className="structured-report">
      <ReportSection title="Executive Summary" text={data.executiveSummary} />
      <ReportSection title="Investment Thesis" text={data.investmentThesis} />
      <ReportSection title="Financial Performance" text={data.financialPerformance} />
      <ReportSection title="Valuation" text={data.valuation} />
      <ReportSection title="Comparables Analysis" text={data.comparablesAnalysis} />
      <ReportListSection title="Strengths" items={data.strengths} />
      <ReportListSection title="Risks" items={data.risks} />
      <ReportSection title="Bull Case" text={data.bullCase} />
      <ReportSection title="Bear Case" text={data.bearCase} />
      <ReportListSection title="Key Questions" items={data.keyQuestions} />
      <ReportSection title="Limitations & Disclaimer" text={data.limitations} />
    </div>
  );
}

function ReportSection({ title, text }: { title: string; text?: string }) {
  if (!text) return null;
  return (
    <div className="report-section">
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}

function ReportListSection({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="report-section">
      <h4>{title}</h4>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
