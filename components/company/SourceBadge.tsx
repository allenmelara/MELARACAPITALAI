export type FieldSource = "filing" | "derived" | "live" | "not_found" | undefined;

// Provenance chip shown next to each auto-populated financial input, so the
// analyst can tell a real SEC-reported figure from a derived estimate or a
// value the filings didn't cover (and therefore must be reviewed by hand).
const CONFIG: Record<string, { label: string; className: string }> = {
  filing: { label: "SEC filing", className: "source-filing" },
  derived: { label: "Derived", className: "source-derived" },
  live: { label: "Live price", className: "source-live" },
  not_found: { label: "Review", className: "source-missing" }
};

export default function SourceBadge({ status }: { status: FieldSource }) {
  if (!status) return null;
  const config = CONFIG[status];
  if (!config) return null;
  return <span className={`source-badge ${config.className}`}>{config.label}</span>;
}
