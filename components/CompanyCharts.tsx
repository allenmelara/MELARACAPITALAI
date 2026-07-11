"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import type { calculateCompanyMetrics } from "@/lib/finance";
import { money } from "@/lib/finance";
import type { FinancialStatements } from "@/lib/secEdgar";

const ACCENT = "#69e59b";
const MUTED = "#9fb0a5";
const BORDER = "#294033";
const PANEL = "#101c16";

type Metrics = ReturnType<typeof calculateCompanyMetrics>;

export default function CompanyCharts({
  companyName,
  metrics,
  comparables,
  statements
}: {
  companyName: string;
  metrics: Metrics;
  comparables: Array<{ ticker: string; evToEbitda: number | null }>;
  statements?: FinancialStatements | null;
}) {
  const revenueRow = statements?.incomeStatement.find((r) => r.key === "revenue");
  // Statement periods are newest-first; reverse to chronological (left-to-right) for a trend chart.
  const revenueHistory =
    revenueRow && statements
      ? statements.periods
          .map((period, i) => ({ period, revenue: revenueRow.values[i] }))
          .filter((d): d is { period: string; revenue: number } => d.revenue !== null)
          .reverse()
      : [];

  const multiplesData = [
    { name: companyName || "This company", evToEbitda: round1(metrics.evToEbitda), isSubject: true },
    ...comparables
      .filter((c) => c.evToEbitda !== null)
      .map((c) => ({ name: c.ticker, evToEbitda: round1(c.evToEbitda as number), isSubject: false }))
  ];

  const projectionData = metrics.projection.map((p) => ({
    year: `Year ${p.year}`,
    unleveredFcf: Math.round(p.unleveredFcf)
  }));

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <h4>EV / EBITDA vs. comparables</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={multiplesData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={BORDER} vertical={false} />
            <XAxis dataKey="name" stroke={MUTED} fontSize={12} />
            <YAxis stroke={MUTED} fontSize={12} tickFormatter={(v) => `${v}x`} />
            <Tooltip
              contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#f3f7f4" }}
              formatter={(value: number) => [`${value}x`, "EV / EBITDA"]}
            />
            <Bar dataKey="evToEbitda" radius={[6, 6, 0, 0]}>
              {multiplesData.map((entry, index) => (
                <Cell key={index} fill={entry.isSubject ? ACCENT : MUTED} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h4>{metrics.projectionYears}-year unlevered free cash flow</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={projectionData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={BORDER} vertical={false} />
            <XAxis dataKey="year" stroke={MUTED} fontSize={12} />
            <YAxis stroke={MUTED} fontSize={12} tickFormatter={(v) => money(v)} width={80} />
            <Tooltip
              contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#f3f7f4" }}
              formatter={(value: number) => [money(value), "Unlevered FCF"]}
            />
            <Bar dataKey="unleveredFcf" fill={ACCENT} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {revenueHistory.length >= 2 && (
        <div className="chart-card">
          <h4>Revenue history (from SEC filings)</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueHistory} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={BORDER} vertical={false} />
              <XAxis dataKey="period" stroke={MUTED} fontSize={12} />
              <YAxis stroke={MUTED} fontSize={12} tickFormatter={(v) => money(v)} width={80} />
              <Tooltip
                contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#f3f7f4" }}
                formatter={(value: number) => [money(value), "Revenue"]}
              />
              <Bar dataKey="revenue" fill={ACCENT} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}
