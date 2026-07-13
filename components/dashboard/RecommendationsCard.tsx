"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Recommendation } from "@/lib/recommendations";

const PRIORITY_LABELS: Record<Recommendation["priority"], string> = { high: "High", medium: "Medium", low: "Low" };

// Self-fetching, like components/CompanyMarketCharts.tsx — generation can
// take a few seconds on a cache miss, so this shouldn't block the dashboard's
// server render the way the rest of the page's data does.
export default function RecommendationsCard() {
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/recommendations")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setRecommendations(data.recommendations ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load recommendations.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <h2 style={{ marginTop: 0 }}>AI recommendations</h2>
      <p className="disclaimer" style={{ marginTop: 0 }}>
        Educational suggestions based on your dashboard data — not personalized financial advice. Regenerates once
        per day.
      </p>

      {error && <div className="error">{error}</div>}

      {!error && recommendations === null && (
        <p className="disclaimer">
          <Loader2 size={14} className="spin" style={{ verticalAlign: "-2px", marginRight: 6 }} />
          Generating your recommendations...
        </p>
      )}

      {recommendations !== null && recommendations.length === 0 && !error && (
        <p className="disclaimer">
          Add a few more details — cash accounts, debts, or a goal — and check back for personalized suggestions.
        </p>
      )}

      {recommendations && recommendations.length > 0 && (
        <ul className="recommendations-list">
          {recommendations.map((r) => (
            <li key={r.id} className="recommendation-item">
              <div className="recommendation-item-head">
                <strong>{r.title}</strong>
                <span className={`recommendation-priority recommendation-priority-${r.priority}`}>
                  {PRIORITY_LABELS[r.priority]}
                </span>
              </div>
              <p>{r.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
