import type { Recommendation, StructuredCompanyReport } from "@/lib/prompts";

export default function StructuredReport({ data }: { data: StructuredCompanyReport }) {
  return (
    <div className="structured-report">
      <ReportSection title="Investment Summary" text={data.executiveSummary} />
      {data.recommendation && (
        <RecommendationCard rating={data.recommendation} rationale={data.recommendationRationale} />
      )}
      <ReportSection title="Investment Thesis" text={data.investmentThesis} />
      <ReportSection title="Business Overview" text={data.businessOverview} />
      <ReportSection title="Financial Analysis" text={data.financialPerformance} />
      <ReportSection title="DCF Valuation" text={data.valuation} />
      <ReportSection title="Ratio Analysis" text={data.ratioAnalysis} />
      <ReportSection title="Comparable Company Analysis" text={data.comparablesAnalysis} />
      <ReportListSection title="Strengths" items={data.strengths} />
      <ReportListSection title="Key Risks" items={data.risks} />
      <ReportSection title="Bull Case" text={data.bullCase} />
      <ReportSection title="Bear Case" text={data.bearCase} />
      <ReportListSection title="Key Questions" items={data.keyQuestions} />
      <ReportSection title="Limitations & Disclaimer" text={data.limitations} />
    </div>
  );
}

const RATING_CLASS: Record<Recommendation, string> = {
  Buy: "recommendation-buy",
  Hold: "recommendation-hold",
  Sell: "recommendation-sell"
};

function RecommendationCard({ rating, rationale }: { rating: Recommendation; rationale?: string }) {
  return (
    <div className={`recommendation-card ${RATING_CLASS[rating]}`}>
      <div className="recommendation-header">
        <span className="recommendation-label">Investment Recommendation</span>
        <span className="recommendation-badge">{rating}</span>
      </div>
      {rationale && <p className="recommendation-rationale">{rationale}</p>}
      <p className="disclaimer">
        A general, educational equity-research-style view — not individualized investment advice.
      </p>
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
