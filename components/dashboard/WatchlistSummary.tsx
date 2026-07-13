import Link from "next/link";
import { money } from "@/lib/finance";
import type { WatchlistQuote } from "@/lib/watchlist";

export default function WatchlistSummary({ items }: { items: WatchlistQuote[] }) {
  const top = items.slice(0, 5);

  return (
    <section className="dash-section">
      <h2>Watchlist</h2>
      {top.length === 0 ? (
        <div className="dash-section-empty">
          <p className="disclaimer">Nothing on your watchlist yet.</p>
          <Link href="/dashboard/portfolio" className="secondary">
            Add a symbol
          </Link>
        </div>
      ) : (
        <ul className="dash-list">
          {top.map((w) => (
            <li key={w.id}>
              <Link href="/dashboard/portfolio">
                <span className="dash-list-title">{w.symbol}</span>
                <span className="dash-list-meta">
                  {w.price !== null ? money(w.price) : "—"}
                  {w.changePercent !== null && ` · ${w.changePercent >= 0 ? "+" : ""}${w.changePercent.toFixed(2)}%`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
