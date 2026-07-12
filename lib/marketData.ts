import { getQuoteChange } from "./finnhub";
import { getCached, setCached } from "./ttlCache";
import { logWarn } from "./logger";

const CACHE_KEY = "market-snapshot";
const CACHE_TTL_MS = 60_000;

export type MarketQuote = {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
  // True when the symbol is a liquid tracking proxy rather than the named
  // index/commodity itself (e.g. SPY for the S&P 500) — Finnhub's free tier
  // doesn't carry real index/commodity prices.
  isProxy: boolean;
};

export type FearGreed = {
  value: number;
  label: string;
};

export type MarketSnapshot = {
  indices: MarketQuote[];
  crypto: MarketQuote[];
  commodities: MarketQuote[];
  fearGreed: FearGreed | null;
  gainers: MarketQuote[];
  losers: MarketQuote[];
  generatedAt: string;
};

// Large, liquid names used to derive a "top movers" panel without a paid
// screener endpoint — not the full S&P 500, so treat as a curated watchlist.
// Kept short (rather than the full S&P 500) because every symbol here is one
// Finnhub call, and the free tier's rate limit is tight.
const MOVER_UNIVERSE = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "JPM", "XOM"];

// Finnhub's free tier rejects bursts of concurrent requests with 429s well
// before the documented per-minute cap. Serialize every quote call through
// one queue with a fixed gap instead of firing them all in parallel.
const FINNHUB_GAP_MS = 200;
let finnhubQueue: Promise<unknown> = Promise.resolve();

function throttledQuote(symbol: string) {
  const call = finnhubQueue.then(
    () => new Promise<void>((resolve) => setTimeout(resolve, FINNHUB_GAP_MS))
  ).then(() => getQuoteChange(symbol));
  finnhubQueue = call.catch(() => undefined);
  return call;
}

async function safeQuote(symbol: string, label: string, isProxy: boolean): Promise<MarketQuote | null> {
  try {
    const q = await throttledQuote(symbol);
    if (!q) return null;
    return { symbol, label, price: q.price, change: q.change, changePercent: q.changePercent, isProxy };
  } catch (error) {
    logWarn(`marketData.quote.${symbol}`, error);
    return null;
  }
}

async function fetchIndicesAndCommodities() {
  const [spy, qqq, gld, uso] = await Promise.all([
    safeQuote("SPY", "S&P 500", true),
    safeQuote("QQQ", "NASDAQ 100", true),
    safeQuote("GLD", "Gold", true),
    safeQuote("USO", "Oil", true)
  ]);
  return {
    indices: [spy, qqq].filter((q): q is MarketQuote => q !== null),
    commodities: [gld, uso].filter((q): q is MarketQuote => q !== null)
  };
}

async function fetchCrypto(): Promise<MarketQuote[]> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true",
      { next: { revalidate: 60 } }
    );
    if (!response.ok) throw new Error(`CoinGecko request failed: ${response.status}`);
    const data = (await response.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;

    const out: MarketQuote[] = [];
    const entries: Array<[string, string, string]> = [
      ["bitcoin", "BTC", "Bitcoin"],
      ["ethereum", "ETH", "Ethereum"]
    ];
    for (const [id, symbol, label] of entries) {
      const entry = data[id];
      if (!entry?.usd) continue;
      const changePercent = entry.usd_24h_change ?? 0;
      out.push({
        symbol,
        label,
        price: entry.usd,
        change: (entry.usd * changePercent) / 100,
        changePercent,
        isProxy: false
      });
    }
    return out;
  } catch (error) {
    logWarn("marketData.crypto", error);
    return [];
  }
}

async function fetchFearGreed(): Promise<FearGreed | null> {
  try {
    const response = await fetch("https://api.alternative.me/fng/?limit=1", { next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`Fear & Greed request failed: ${response.status}`);
    const data = (await response.json()) as { data?: Array<{ value?: string; value_classification?: string }> };
    const entry = data.data?.[0];
    if (!entry?.value) return null;
    return { value: Number(entry.value), label: entry.value_classification ?? "" };
  } catch (error) {
    logWarn("marketData.fearGreed", error);
    return null;
  }
}

async function fetchMovers() {
  const quotes = (await Promise.all(MOVER_UNIVERSE.map((symbol) => safeQuote(symbol, symbol, false)))).filter(
    (q): q is MarketQuote => q !== null
  );
  const sorted = [...quotes].sort((a, b) => b.changePercent - a.changePercent);
  return {
    gainers: sorted.slice(0, 3),
    losers: sorted.slice(-3).reverse()
  };
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const cached = getCached<MarketSnapshot>(CACHE_KEY);
  if (cached) return cached;

  const [{ indices, commodities }, crypto, fearGreed, { gainers, losers }] = await Promise.all([
    fetchIndicesAndCommodities(),
    fetchCrypto(),
    fetchFearGreed(),
    fetchMovers()
  ]);

  const snapshot: MarketSnapshot = {
    indices,
    crypto,
    commodities,
    fearGreed,
    gainers,
    losers,
    generatedAt: new Date().toISOString()
  };
  setCached(CACHE_KEY, snapshot, CACHE_TTL_MS);
  return snapshot;
}
