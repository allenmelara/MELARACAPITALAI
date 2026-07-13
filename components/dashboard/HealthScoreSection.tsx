"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Mission } from "@/lib/missions";
import type { HealthScoreHistoryPoint } from "@/lib/healthScore";
import type { Streak } from "@/lib/streaks";
import MissionsList from "@/components/dashboard/MissionsList";
import CelebrationBanner from "@/components/dashboard/CelebrationBanner";

type HealthScoreSummary = {
  overallScore: number | null;
  history: HealthScoreHistoryPoint[];
  missions: Mission[];
  savingsStreak: Streak;
  goals: Array<{ id: string; name: string; progressPercent: number }>;
};

export default function HealthScoreSection() {
  const [summary, setSummary] = useState<HealthScoreSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health-score")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && typeof data.overallScore !== "undefined") setSummary(data);
      })
      .catch(() => {
        // Silent — the score tile just stays in its loading state.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {summary && (
        <CelebrationBanner history={summary.history} goals={summary.goals} savingsStreak={summary.savingsStreak} />
      )}
      <Link href="/dashboard/health" className="panel health-score-summary-tile">
        <div>
          <span className="dash-metric-tile-label">Financial Health Score</span>
          <div>
            <span className="health-score-number health-score-number-compact">
              {summary === null ? "…" : (summary.overallScore ?? "—")}
            </span>
            <span className="health-score-max"> / 100</span>
          </div>
        </div>
        <span className="health-score-summary-cta">View full breakdown →</span>
      </Link>
      <MissionsList missions={summary?.missions ?? []} />
    </>
  );
}
