import { percent } from "@/lib/finance";
import type { KeyRatios } from "@/lib/ratios";

function formatRatio(value: number | null, suffix = "x") {
  return value !== null && Number.isFinite(value) ? `${value.toFixed(1)}${suffix}` : "—";
}

function formatPercentRatio(value: number | null) {
  return value !== null && Number.isFinite(value) ? percent(value) : "—";
}

const ROWS: Array<{
  key: keyof KeyRatios;
  label: string;
  group: "Valuation" | "Profitability" | "Leverage & liquidity";
  format: (value: number | null) => string;
}> = [
  { key: "evToEbitda", label: "EV / EBITDA", group: "Valuation", format: (v) => formatRatio(v) },
  { key: "peRatio", label: "P / E", group: "Valuation", format: (v) => formatRatio(v) },
  { key: "ebitdaMargin", label: "EBITDA margin", group: "Profitability", format: formatPercentRatio },
  { key: "netMargin", label: "Net margin", group: "Profitability", format: formatPercentRatio },
  { key: "returnOnEquity", label: "Return on equity", group: "Profitability", format: formatPercentRatio },
  { key: "returnOnAssets", label: "Return on assets", group: "Profitability", format: formatPercentRatio },
  { key: "debtToEbitda", label: "Debt / EBITDA", group: "Leverage & liquidity", format: (v) => formatRatio(v) },
  { key: "debtToEquity", label: "Debt / Equity", group: "Leverage & liquidity", format: (v) => formatRatio(v) },
  { key: "currentRatio", label: "Current ratio", group: "Leverage & liquidity", format: (v) => formatRatio(v) }
];

export default function RatiosPanel({ ratios }: { ratios: KeyRatios }) {
  const groups = ["Valuation", "Profitability", "Leverage & liquidity"] as const;
  return (
    <div className="ratios-panel">
      {groups.map((group) => (
        <div className="ratios-group" key={group}>
          <h4 className="ratios-group-title">{group}</h4>
          <div className="ratios-grid">
            {ROWS.filter((row) => row.group === group).map((row) => (
              <div className="ratio-tile" key={row.key}>
                <span>{row.label}</span>
                <strong>{row.format(ratios[row.key] as number | null)}</strong>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
