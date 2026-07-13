"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { money } from "@/lib/finance";
import type { NetWorthHistoryPoint } from "@/lib/netWorth";

const ACCENT = "#69e59b";
const MUTED = "#9fb0a5";
const BORDER = "#294033";
const PANEL = "#101c16";

export default function NetWorthChart({ history }: { history: NetWorthHistoryPoint[] }) {
  if (history.length < 2) {
    return (
      <p className="disclaimer">
        Net-worth history starts building from today — check back after a few days to see a trend line.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={history} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={BORDER} vertical={false} />
        <XAxis dataKey="date" stroke={MUTED} fontSize={12} />
        <YAxis stroke={MUTED} fontSize={12} tickFormatter={(v) => money(v)} width={80} />
        <Tooltip
          contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#f3f7f4" }}
          formatter={(value: number) => money(value)}
        />
        <Line type="monotone" dataKey="netWorth" name="Net worth" stroke={ACCENT} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
