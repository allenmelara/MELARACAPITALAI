export default function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const isUnlimited = !Number.isFinite(limit);
  const pct = isUnlimited ? 6 : Math.min(100, (used / Math.max(limit, 1)) * 100);
  return (
    <div className="usage-bar-block">
      <div className="usage-bar-label">
        <span>{label}</span>
        <span>{isUnlimited ? `${used} used` : `${used} / ${limit}`}</span>
      </div>
      <div className="usage-bar-track">
        <div className="usage-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
