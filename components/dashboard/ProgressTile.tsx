import Link from "next/link";
import { money, percent } from "@/lib/finance";

export default function ProgressTile({
  title,
  progress,
  current,
  target,
  isEstimate,
  emptyMessage,
  ctaHref,
  ctaLabel
}: {
  title: string;
  progress: number | null;
  current?: number;
  target?: number;
  isEstimate?: boolean;
  emptyMessage: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  if (progress === null) {
    return (
      <div className="panel dash-progress-tile" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p className="disclaimer" style={{ marginTop: 0 }}>
          {emptyMessage}
        </p>
        <Link href={ctaHref} className="secondary">
          {ctaLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="panel dash-progress-tile" style={{ marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div className="usage-bar-block">
        <div className="usage-bar-label">
          <span>
            {current !== undefined && target !== undefined ? `${money(current)} / ${money(target)}` : ""}
          </span>
          <span>{percent(progress)}</span>
        </div>
        <div className="usage-bar-track">
          <div className="usage-bar-fill" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
      </div>
      {isEstimate && (
        <p className="disclaimer" style={{ marginBottom: 0 }}>
          Estimated from your financial profile ranges — log real numbers for a more accurate picture.
        </p>
      )}
    </div>
  );
}
