"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { HealthScoreHistoryPoint } from "@/lib/healthScore";

const ACCENT = "#69e59b";
const MUTED = "#9fb0a5";
const BORDER = "#294033";
const PANEL = "#101c16";

export default function HealthScoreChart({ history }: { history: HealthScoreHistoryPoint[] }) {
  const withScores = history.filter((h) => h.score !== null);
  if (withScores.length < 2) {
    return (
      <p className="disclaimer">
        Your score history starts building from today — check back after a few days to see a trend line.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={withScores} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={BORDER} vertical={false} />
        <XAxis dataKey="date" stroke={MUTED} fontSize={12} />
        <YAxis stroke={MUTED} fontSize={12} domain={[0, 100]} width={30} />
        <Tooltip
          contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#f3f7f4" }}
        />
        <Line type="monotone" dataKey="score" name="Score" stroke={ACCENT} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
