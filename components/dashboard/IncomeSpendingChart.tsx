"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { money } from "@/lib/finance";
import { totalSpending } from "@/lib/budgetCalc";
import type { MonthlyBudget } from "@/lib/monthlyBudget";

const ACCENT = "#69e59b";
const DANGER = "#ff8f8f";
const MUTED = "#9fb0a5";
const BORDER = "#294033";
const PANEL = "#101c16";

export default function IncomeSpendingChart({ history }: { history: MonthlyBudget[] }) {
  if (history.length < 2) {
    return (
      <p className="disclaimer">
        Log at least two months of budgets to see your income-vs-spending trend.
      </p>
    );
  }

  const data = history.map((b) => ({ month: b.month, income: b.income, spending: totalSpending(b) }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={BORDER} vertical={false} />
        <XAxis dataKey="month" stroke={MUTED} fontSize={12} />
        <YAxis stroke={MUTED} fontSize={12} tickFormatter={(v) => money(v)} width={80} />
        <Tooltip
          contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#f3f7f4" }}
          formatter={(value: number) => money(value)}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: MUTED }} />
        <Bar dataKey="income" name="Income" fill={ACCENT} radius={[4, 4, 0, 0]} />
        <Bar dataKey="spending" name="Spending" fill={DANGER} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
