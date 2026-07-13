"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { money } from "@/lib/finance";
import type { CompanyChartsData } from "@/app/api/company-charts/route";

const ACCENT = "#69e59b";
const MUTED = "#9fb0a5";
const BORDER = "#294033";
const PANEL = "#101c16";
const DANGER = "#ff8f8f";
const BLUE = "#6bd4e5";
const GOLD = "#e5c76b";

const RANGES: Array<{ key: "1M" | "6M" | "1Y" | "5Y"; label: string; days: number }> = [
  { key: "1M", label: "1M", days: 30 },
  { key: "6M", label: "6M", days: 182 },
  { key: "1Y", label: "1Y", days: 365 },
  { key: "5Y", label: "5Y", days: 365 * 5 }
];

const tooltipStyle = { background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#f3f7f4" };

export default function CompanyMarketCharts({ ticker }: { ticker: string }) {
  const [data, setData] = useState<CompanyChartsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [range, setRange] = useState<"1M" | "6M" | "1Y" | "5Y">("1Y");

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/company-charts?ticker=${encodeURIComponent(ticker)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Failed to load charts.");
        if (!cancelled) setData(body.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load charts.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const filteredPrice = useMemo(() => {
    if (!data?.priceHistory.length) return [];
    const days = RANGES.find((r) => r.key === range)?.days ?? 365;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return data.priceHistory.filter((p) => new Date(p.date).getTime() >= cutoff);
  }, [data, range]);

  const earningsData = useMemo(
    () =>
      (data?.earnings ?? []).map((e) => ({
        period: e.period,
        actual: e.actual,
        estimate: e.estimate
      })),
    [data]
  );

  const analystData = useMemo(
    () =>
      (data?.analystRatings ?? []).map((r) => ({
        period: r.period,
        "Strong Buy": r.strongBuy,
        Buy: r.buy,
        Hold: r.hold,
        Sell: r.sell,
        "Strong Sell": r.strongSell
      })),
    [data]
  );

  if (!ticker) return null;

  if (loading) {
    return (
      <div className="chart-card chart-card-full">
        <p className="disclaimer">Loading market charts for {ticker}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-card chart-card-full">
        <p className="disclaimer">Market charts unavailable for {ticker}: {error}</p>
      </div>
    );
  }

  if (!data) return null;

  const hasPrice = filteredPrice.length >= 2;
  const hasEarnings = earningsData.length >= 1;
  const hasMargins = (data.margins?.length ?? 0) >= 1;
  const hasAnalyst = analystData.length >= 1;

  if (!hasPrice && !hasEarnings && !hasMargins && !hasAnalyst) return null;

  return (
    <div className="charts-grid">
      {hasPrice && (
        <div className="chart-card chart-card-full">
          <div className="chart-card-header">
            <h4>{ticker} price history</h4>
            <div className="range-tabs">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  className={`range-tab ${range === r.key ? "active" : ""}`}
                  onClick={() => setRange(r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={filteredPrice} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={BORDER} vertical={false} />
              <XAxis dataKey="date" stroke={MUTED} fontSize={11} minTickGap={40} />
              <YAxis stroke={MUTED} fontSize={12} domain={["auto", "auto"]} tickFormatter={(v) => money(v)} width={80} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [money(value), "Close"]} />
              <Line type="monotone" dataKey="close" stroke={ACCENT} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="disclaimer chart-source-note">
            Price history via an unofficial data source — for reference only, not guaranteed accurate or real-time.
          </p>
        </div>
      )}

      {hasEarnings && (
        <div className="chart-card">
          <h4>Earnings history (EPS)</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={earningsData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={BORDER} vertical={false} />
              <XAxis dataKey="period" stroke={MUTED} fontSize={12} />
              <YAxis stroke={MUTED} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: MUTED }} />
              <Bar dataKey="estimate" name="Estimate" fill={MUTED} radius={[6, 6, 0, 0]} />
              <Bar dataKey="actual" name="Actual" fill={ACCENT} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasMargins && (
        <div className="chart-card">
          <h4>Profit margins (quarterly)</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.margins} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={BORDER} vertical={false} />
              <XAxis dataKey="period" stroke={MUTED} fontSize={11} minTickGap={30} />
              <YAxis stroke={MUTED} fontSize={12} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `${(value * 100).toFixed(1)}%`} />
              <Legend wrapperStyle={{ fontSize: 12, color: MUTED }} />
              <Line type="monotone" dataKey="grossMargin" name="Gross" stroke={BLUE} strokeWidth={2} dot={false} />
              <Line
                type="monotone"
                dataKey="operatingMargin"
                name="Operating"
                stroke={GOLD}
                strokeWidth={2}
                dot={false}
              />
              <Line type="monotone" dataKey="netMargin" name="Net" stroke={ACCENT} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasAnalyst && (
        <div className="chart-card">
          <h4>Analyst ratings</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analystData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={BORDER} vertical={false} />
              <XAxis dataKey="period" stroke={MUTED} fontSize={11} minTickGap={30} />
              <YAxis stroke={MUTED} fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: MUTED }} />
              <Bar dataKey="Strong Buy" stackId="a" fill={ACCENT} />
              <Bar dataKey="Buy" stackId="a" fill={BLUE} />
              <Bar dataKey="Hold" stackId="a" fill={MUTED} />
              <Bar dataKey="Sell" stackId="a" fill={GOLD} />
              <Bar dataKey="Strong Sell" stackId="a" fill={DANGER} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
