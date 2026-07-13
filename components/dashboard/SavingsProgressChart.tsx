"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { totalSpending } from "@/lib/budgetCalc";
import type { MonthlyBudget } from "@/lib/monthlyBudget";

const ACCENT = "#69e59b";
const MUTED = "#9fb0a5";
const BORDER = "#294033";
const PANEL = "#101c16";

export default function SavingsProgressChart({ history }: { history: MonthlyBudget[] }) {
  if (history.length < 2) {
    return <p className="disclaimer">Log at least two months of budgets to see your savings-rate trend.</p>;
  }

  const data = history.map((b) => ({
    month: b.month,
    savingsRate: b.income > 0 ? ((b.income - totalSpending(b)) / b.income) * 100 : 0
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={BORDER} vertical={false} />
        <XAxis dataKey="month" stroke={MUTED} fontSize={12} />
        <YAxis stroke={MUTED} fontSize={12} tickFormatter={(v) => `${v}%`} width={50} />
        <Tooltip
          contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#f3f7f4" }}
          formatter={(value: number) => `${value.toFixed(1)}%`}
        />
        <Line type="monotone" dataKey="savingsRate" name="Savings rate" stroke={ACCENT} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
