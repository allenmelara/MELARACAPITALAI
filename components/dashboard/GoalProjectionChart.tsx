"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { money } from "@/lib/finance";
import { calculateGoalProjection } from "@/lib/goalCalc";
import type { FinancialGoal } from "@/lib/financialGoals";

const COLORS = ["#69e59b", "#6bd4e5", "#e5c76b", "#e58f6b", "#a56be5", "#e56bb0", "#6be58a", "#e5e06b"];
const MUTED = "#9fb0a5";
const BORDER = "#294033";
const PANEL = "#101c16";

export default function GoalProjectionChart({ goals }: { goals: FinancialGoal[] }) {
  const goalsWithDates = goals.filter((g) => g.targetDate);
  if (goalsWithDates.length === 0) {
    return <p className="disclaimer">Add a target date to a goal to see its projected path here.</p>;
  }

  // Merge each goal's {date, amount} series into one dataset keyed by date,
  // one column per goal, so a single chart can plot every goal's line.
  const dateSet = new Set<string>();
  const perGoalSeries = goalsWithDates.map((g) => ({ goal: g, ...calculateGoalProjection(g) }));
  for (const { series } of perGoalSeries) {
    for (const point of series) dateSet.add(point.date);
  }
  const dates = Array.from(dateSet).sort();
  const data = dates.map((date) => {
    const row: Record<string, string | number> = { date };
    for (const { goal, series } of perGoalSeries) {
      const point = series.find((p) => p.date === date);
      if (point) row[goal.name] = Math.round(point.amount);
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={BORDER} vertical={false} />
        <XAxis dataKey="date" stroke={MUTED} fontSize={12} />
        <YAxis stroke={MUTED} fontSize={12} tickFormatter={(v) => money(v)} width={80} />
        <Tooltip
          contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#f3f7f4" }}
          formatter={(value: number) => money(value)}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: MUTED }} />
        {goalsWithDates.map((g, i) => (
          <Line
            key={g.id}
            type="monotone"
            dataKey={g.name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
