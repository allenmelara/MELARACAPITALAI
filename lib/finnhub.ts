function apiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    throw new Error("FINNHUB_API_KEY is not configured.");
  }
  return key;
}

// Finnhub's free tier rejects bursts of concurrent requests with 429s well
// before the documented per-minute cap. Every caller in this module —
// market dashboard, portfolio valuation, company lookup — goes through one
// shared queue with a fixed gap instead of firing requests in parallel.
const FINNHUB_GAP_MS = 200;
let finnhubQueue: Promise<unknown> = Promise.resolve();

function throttledFetch(url: string): Promise<Response> {
  const call = finnhubQueue
    .then(() => new Promise<void>((resolve) => setTimeout(resolve, FINNHUB_GAP_MS)))
    .then(() => fetch(url));
  finnhubQueue = call.catch(() => undefined);
  return call;
}

export type Quote = {
  currentPrice: number;
};

export async function getQuote(symbol: string): Promise<Quote | null> {
  const response = await throttledFetch(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey()}`
  );
  if (!response.ok) {
    throw new Error(`Finnhub quote request failed: ${response.status}`);
  }
  const data = (await response.json()) as { c?: number };
  if (!data.c || data.c <= 0) return null;
  return { currentPrice: data.c };
}

export type QuoteChange = {
  price: number;
  change: number;
  changePercent: number;
};

// Same endpoint as getQuote, but also surfaces Finnhub's own precomputed
// change/changePercent (d, dp) instead of just the current price — used by
// the market dashboard, the portfolio tracker, and the assistant's
// live-quote tool.
export async function getQuoteChange(symbol: string): Promise<QuoteChange | null> {
  const response = await throttledFetch(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey()}`
  );
  if (!response.ok) {
    throw new Error(`Finnhub quote request failed: ${response.status}`);
  }
  const data = (await response.json()) as { c?: number; d?: number; dp?: number };
  if (!data.c || data.c <= 0) return null;
  return { price: data.c, change: data.d ?? 0, changePercent: data.dp ?? 0 };
}

export type Profile = {
  sharesOutstanding: number | null;
  name: string | null;
  exchange: string | null;
  industry: string | null;
  logo: string | null;
  currency: string | null;
  marketCap: number | null;
};

export async function getProfile(symbol: string): Promise<Profile | null> {
  const response = await throttledFetch(
    `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey()}`
  );
  if (!response.ok) {
    throw new Error(`Finnhub profile request failed: ${response.status}`);
  }
  const data = (await response.json()) as {
    shareOutstanding?: number;
    name?: string;
    exchange?: string;
    finnhubIndustry?: string;
    logo?: string;
    currency?: string;
    marketCapitalization?: number;
  };
  // profile2 returns {} for an unknown symbol — treat an empty body as "no profile".
  if (!data.name && !data.shareOutstanding && !data.exchange) return null;
  return {
    // Finnhub reports shareOutstanding and marketCapitalization in millions.
    sharesOutstanding: data.shareOutstanding ? data.shareOutstanding * 1_000_000 : null,
    name: data.name ?? null,
    exchange: normalizeExchange(data.exchange),
    industry: data.finnhubIndustry ?? null,
    logo: data.logo ?? null,
    currency: data.currency ?? null,
    marketCap: data.marketCapitalization ? data.marketCapitalization * 1_000_000 : null
  };
}

// Finnhub returns verbose exchange strings like "NASDAQ NMS - GLOBAL MARKET".
// Collapse them to the recognizable venue name for the selection UI.
function normalizeExchange(raw?: string): string | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper.includes("NASDAQ")) return "NASDAQ";
  if (upper.includes("NEW YORK") || upper.includes("NYSE")) return "NYSE";
  if (upper.includes("ARCA")) return "NYSE Arca";
  if (upper.includes("BATS") || upper.includes("CBOE")) return "Cboe";
  // Fall back to the first segment before a separator, title-cased lightly.
  return raw.split(/[-,]/)[0].trim();
}

export type SymbolSearchResult = {
  symbol: string;
  name: string;
  exchangeType: string;
};

// Powers the company-selection search box. Finnhub's /search returns a mix of
// equities, ADRs, and derivatives across venues; we keep US-listed common stock
// (primary listings, where the raw symbol has no venue suffix) so the user
// picks a filer we can actually resolve to SEC facts later.
export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  const response = await throttledFetch(
    `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey()}`
  );
  if (!response.ok) {
    throw new Error(`Finnhub search request failed: ${response.status}`);
  }
  const data = (await response.json()) as {
    result?: Array<{ description?: string; displaySymbol?: string; symbol?: string; type?: string }>;
  };

  return (data.result ?? [])
    .filter((item) => {
      if (!item.symbol || !item.description) return false;
      if (item.type && item.type !== "Common Stock") return false;
      // Skip foreign/OTC listings that carry a venue suffix (e.g. "AAPL.MX").
      return !item.symbol.includes(".");
    })
    .slice(0, 8)
    .map((item) => ({
      symbol: (item.displaySymbol || item.symbol) as string,
      name: item.description as string,
      exchangeType: item.type ?? "Common Stock"
    }));
}
