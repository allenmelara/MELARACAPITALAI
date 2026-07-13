"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { money } from "@/lib/finance";
import type { PortfolioSummary } from "@/lib/portfolio";

const COLORS = ["#69e59b", "#6bd4e5", "#e5c76b", "#e58f6b", "#a56be5", "#e56bb0", "#6be58a", "#e5e06b"];
const BORDER = "#294033";
const PANEL = "#101c16";

export default function InvestmentAllocationChart({ allocation }: { allocation: PortfolioSummary["allocation"] }) {
  if (allocation.length === 0) {
    return <p className="disclaimer">Add a holding on the Portfolio Tracker to see your allocation here.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={allocation} dataKey="value" nameKey="symbol" innerRadius={60} outerRadius={90} paddingAngle={2}>
          {allocation.map((a, i) => (
            <Cell key={a.symbol} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#f3f7f4" }}
          formatter={(value: number) => money(value)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
