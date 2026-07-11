"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const ACCENT = "#69e59b";
const MUTED = "#9fb0a5";
const BORDER = "#294033";
const PANEL = "#101c16";
const CHAT_COLOR = "#6bd4e5";
const DOC_COLOR = "#e5c76b";

export type MonthlyUsage = {
  month: string;
  credits: number;
  chat: number;
  documents: number;
};

export default function UsageAnalyticsChart({ data }: { data: MonthlyUsage[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={BORDER} vertical={false} />
        <XAxis dataKey="month" stroke={MUTED} fontSize={12} />
        <YAxis stroke={MUTED} fontSize={12} allowDecimals={false} />
        <Tooltip contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#f3f7f4" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: MUTED }} />
        <Bar dataKey="credits" name="AI Research Credits" fill={ACCENT} radius={[6, 6, 0, 0]} />
        <Bar dataKey="chat" name="Chat messages" fill={CHAT_COLOR} radius={[6, 6, 0, 0]} />
        <Bar dataKey="documents" name="Document uploads" fill={DOC_COLOR} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
