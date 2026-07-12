import type { MarketQuote, MarketSnapshot } from "@/lib/marketData";

function formatPrice(price: number): string {
  return price >= 1000
    ? price.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ChangeBadge({ changePercent }: { changePercent: number }) {
  const positive = changePercent >= 0;
  return (
    <span className={`market-change ${positive ? "market-up" : "market-down"}`}>
      {positive ? "+" : ""}
      {changePercent.toFixed(2)}%
    </span>
  );
}

function MarketCard({ quote }: { quote: MarketQuote }) {
  return (
    <div className="metric market-card">
      <div className="market-card-label">
        {quote.label}
        {quote.isProxy && <span className="market-proxy-tag">via {quote.symbol}</span>}
      </div>
      <div className="market-card-price">${formatPrice(quote.price)}</div>
      <ChangeBadge changePercent={quote.changePercent} />
    </div>
  );
}

function MoverRow({ quote }: { quote: MarketQuote }) {
  return (
    <li className="mover-row">
      <span className="mover-symbol">{quote.symbol}</span>
      <span className="market-card-price mover-price">${formatPrice(quote.price)}</span>
      <ChangeBadge changePercent={quote.changePercent} />
    </li>
  );
}

export default function MarketDashboard({ snapshot }: { snapshot: MarketSnapshot }) {
  const cards = [...snapshot.indices, ...snapshot.crypto, ...snapshot.commodities];

  return (
    <section className="market-dashboard">
      <div className="market-dashboard-header">
        <h2>Markets</h2>
        <span className="disclaimer">
          Indices and commodities tracked via liquid ETF proxies. Not investment advice.
        </span>
      </div>

      <div className="market-grid">
        {cards.map((quote) => (
          <MarketCard key={quote.symbol} quote={quote} />
        ))}

        {snapshot.fearGreed && (
          <div className="metric market-card">
            <div className="market-card-label">Crypto Fear &amp; Greed</div>
            <div className="market-card-price">{snapshot.fearGreed.value}</div>
            <span className="market-fear-greed-label">{snapshot.fearGreed.label}</span>
          </div>
        )}
      </div>

      {(snapshot.gainers.length > 0 || snapshot.losers.length > 0) && (
        <div className="market-movers">
          <div className="panel market-mover-panel">
            <h3>Top Gainers</h3>
            <ul className="mover-list">
              {snapshot.gainers.map((quote) => (
                <MoverRow key={quote.symbol} quote={quote} />
              ))}
            </ul>
          </div>
          <div className="panel market-mover-panel">
            <h3>Top Losers</h3>
            <ul className="mover-list">
              {snapshot.losers.map((quote) => (
                <MoverRow key={quote.symbol} quote={quote} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
