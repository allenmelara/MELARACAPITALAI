"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { money } from "@/lib/finance";
import { calculateDebtPayoff } from "@/lib/debtCalc";
import type { Debt } from "@/lib/debts";

const ACCENT = "#69e59b";
const MUTED = "#9fb0a5";
const BORDER = "#294033";
const PANEL = "#101c16";

export default function DebtPayoffChart({ debts }: { debts: Debt[] }) {
  if (debts.length === 0) {
    return <p className="disclaimer">Add a debt to see a projected payoff timeline.</p>;
  }

  const { series } = calculateDebtPayoff(debts);
  if (series.length < 2) {
    return <p className="disclaimer">Not enough data to project a payoff timeline yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={BORDER} vertical={false} />
        <XAxis dataKey="month" stroke={MUTED} fontSize={12} tickFormatter={(v) => `M${v}`} />
        <YAxis stroke={MUTED} fontSize={12} tickFormatter={(v) => money(v)} width={80} />
        <Tooltip
          contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#f3f7f4" }}
          formatter={(value: number) => money(value)}
          labelFormatter={(v) => `Month ${v}`}
        />
        <Line type="monotone" dataKey="totalBalance" name="Total balance" stroke={ACCENT} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
