"use client";

import { useEffect, useState } from "react";
import type { HealthScoreHistoryPoint } from "@/lib/healthScore";
import type { Streak } from "@/lib/streaks";

const STORAGE_KEY = "melara:dismissed-celebrations";

// Monthly-cadence milestones (savings streaks here are counted in logged
// months, not days) — 3/6/12 months is the sensible equivalent of a
// day-based 7/30/90 streak milestone for data that only updates once a month.
const STREAK_MILESTONES = [3, 6, 12];
const SCORE_RISE_THRESHOLD = 5;

type CelebrationEvent = { id: string; message: string };

function detectCelebrations(
  history: HealthScoreHistoryPoint[],
  goals: Array<{ id: string; name: string; progressPercent: number }>,
  savingsStreak: Streak
): CelebrationEvent[] {
  const events: CelebrationEvent[] = [];

  const withScores = history.filter((h) => h.score !== null);
  if (withScores.length >= 2) {
    const last = withScores[withScores.length - 1];
    const prev = withScores[withScores.length - 2];
    const rise = (last.score as number) - (prev.score as number);
    if (rise >= SCORE_RISE_THRESHOLD) {
      events.push({
        id: `score-${last.date}`,
        message: `Your Financial Health Score rose ${rise} points to ${last.score}.`
      });
    }
  }

  for (const goal of goals) {
    if (goal.progressPercent >= 1) {
      events.push({ id: `goal-${goal.id}`, message: `You've reached your "${goal.name}" goal.` });
    }
  }

  for (const milestone of STREAK_MILESTONES) {
    if (savingsStreak.currentMonths === milestone) {
      events.push({
        id: `streak-${milestone}`,
        message: `${milestone} months in a row with income above spending.`
      });
    }
  }

  return events;
}

export default function CelebrationBanner({
  history,
  goals,
  savingsStreak
}: {
  history: HealthScoreHistoryPoint[];
  goals: Array<{ id: string; name: string; progressPercent: number }>;
  savingsStreak: Streak;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setDismissed(JSON.parse(stored));
    } catch {
      // Ignore malformed localStorage.
    }
  }, []);

  function dismiss(id: string) {
    setDismissed((current) => {
      const next = [...current, id];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  const events = detectCelebrations(history, goals, savingsStreak).filter((e) => !dismissed.includes(e.id));
  if (events.length === 0) return null;

  // Show at most one at a time — quiet, not a wall of confetti.
  const event = events[0];
  return (
    <div className="notice celebration-banner">
      <span>{event.message}</span>
      <button className="celebration-dismiss" onClick={() => dismiss(event.id)} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
