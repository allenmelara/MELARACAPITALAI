import Link from "next/link";

export default function MetricTile({
  label,
  value,
  isSample,
  ctaHref,
  ctaLabel
}: {
  label: string;
  value: string;
  isSample?: boolean;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="metric dash-metric-tile">
      <span>
        {label}
        {isSample && <span className="dash-metric-sample-badge">Example</span>}
      </span>
      <strong>{value}</strong>
      {isSample && ctaHref && ctaLabel && (
        <Link href={ctaHref} className="dash-metric-cta">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
