"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { money } from "@/lib/finance";
import type { MonthlyBudget } from "@/lib/monthlyBudget";

const COLORS = ["#69e59b", "#6bd4e5", "#e5c76b", "#e58f6b", "#a56be5", "#e56bb0", "#6be58a", "#e5e06b"];
const BORDER = "#294033";
const PANEL = "#101c16";

export default function SpendingCategoryChart({ budget }: { budget: MonthlyBudget | null }) {
  const categories = budget?.categories.filter((c) => c.amount > 0) ?? [];

  if (categories.length === 0) {
    return <p className="disclaimer">Log this month's spending by category to see the breakdown here.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={categories} dataKey="amount" nameKey="category" innerRadius={60} outerRadius={90} paddingAngle={2}>
          {categories.map((c, i) => (
            <Cell key={c.category} fill={COLORS[i % COLORS.length]} />
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
