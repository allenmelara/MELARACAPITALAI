import type { CategoryScore } from "@/lib/healthScoreCalc";

export default function HealthScoreBreakdown({ categories }: { categories: CategoryScore[] }) {
  return (
    <div className="health-score-grid">
      {categories.map((c) => (
        <div key={c.key} className="panel health-score-category">
          <div className="usage-bar-block">
            <div className="usage-bar-label">
              <span>{c.label}</span>
              <span>{c.available ? `${c.score.toFixed(1)} / ${c.maxScore}` : "Not yet available"}</span>
            </div>
            <div className="usage-bar-track">
              <div
                className="usage-bar-fill"
                style={{ width: `${c.available ? (c.score / c.maxScore) * 100 : 0}%` }}
              />
            </div>
          </div>
          <p className="disclaimer health-score-explanation">{c.explanation}</p>
          <p className="disclaimer health-score-improve">
            <strong>How to improve:</strong> {c.howToImprove}
          </p>
        </div>
      ))}
    </div>
  );
}
