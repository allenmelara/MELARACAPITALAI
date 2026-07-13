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

export type NewsItem = {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string | null;
  // Unix seconds, as Finnhub returns it — left as-is so callers control
  // conversion to whatever date type they need.
  datetime: number;
};

function parseNewsItems(data: unknown): NewsItem[] {
  const items = data as Array<{
    id?: number;
    headline?: string;
    summary?: string;
    source?: string;
    url?: string;
    image?: string;
    datetime?: number;
  }>;
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item.id !== undefined && item.headline && item.url && item.datetime)
    .map((item) => ({
      id: item.id as number,
      headline: item.headline as string,
      summary: item.summary ?? "",
      source: item.source ?? "Unknown",
      url: item.url as string,
      image: item.image || null,
      datetime: item.datetime as number
    }));
}

export async function getGeneralNews(): Promise<NewsItem[]> {
  const response = await throttledFetch(`https://finnhub.io/api/v1/news?category=general&token=${apiKey()}`);
  if (!response.ok) {
    throw new Error(`Finnhub news request failed: ${response.status}`);
  }
  return parseNewsItems(await response.json());
}

// Finnhub requires an explicit from/to window for company news; default to
// the trailing week so recently-added holdings still surface something.
export async function getCompanyNews(symbol: string, days = 7): Promise<NewsItem[]> {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const response = await throttledFetch(
    `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fmt(from)}&to=${fmt(to)}&token=${apiKey()}`
  );
  if (!response.ok) {
    throw new Error(`Finnhub company news request failed: ${response.status}`);
  }
  return parseNewsItems(await response.json());
}

export type EarningsQuarter = {
  period: string;
  year: number;
  quarter: number;
  actual: number | null;
  estimate: number | null;
  surprisePercent: number | null;
};

// Actual vs. estimated EPS for the trailing several quarters — free tier,
// unlike /stock/candle and /stock/price-target.
export async function getEarningsHistory(symbol: string): Promise<EarningsQuarter[]> {
  const response = await throttledFetch(
    `https://finnhub.io/api/v1/stock/earnings?symbol=${encodeURIComponent(symbol)}&token=${apiKey()}`
  );
  if (!response.ok) {
    throw new Error(`Finnhub earnings request failed: ${response.status}`);
  }
  const data = (await response.json()) as Array<{
    period?: string;
    year?: number;
    quarter?: number;
    actual?: number | null;
    estimate?: number | null;
    surprisePercent?: number | null;
  }>;
  if (!Array.isArray(data)) return [];
  // Finnhub returns newest-first; reverse to chronological for a left-to-right chart.
  return data
    .filter((d) => d.period)
    .map((d) => ({
      period: d.period as string,
      year: d.year ?? 0,
      quarter: d.quarter ?? 0,
      actual: d.actual ?? null,
      estimate: d.estimate ?? null,
      surprisePercent: d.surprisePercent ?? null
    }))
    .reverse();
}

export type MarginPoint = {
  period: string;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
};

// Quarterly margin history from Finnhub's "basic financials" endpoint —
// the top-level metric object only has the latest snapshot, but the
// `series.quarterly` object carries several years of history per metric.
export async function getMarginHistory(symbol: string): Promise<MarginPoint[]> {
  const response = await throttledFetch(
    `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${apiKey()}`
  );
  if (!response.ok) {
    throw new Error(`Finnhub metric request failed: ${response.status}`);
  }
  const data = (await response.json()) as {
    series?: {
      quarterly?: {
        grossMargin?: Array<{ period: string; v: number }>;
        operatingMargin?: Array<{ period: string; v: number }>;
        netMargin?: Array<{ period: string; v: number }>;
      };
    };
  };
  const quarterly = data.series?.quarterly;
  if (!quarterly) return [];

  const byPeriod = new Map<string, MarginPoint>();
  const addSeries = (
    series: Array<{ period: string; v: number }> | undefined,
    key: "grossMargin" | "operatingMargin" | "netMargin"
  ) => {
    for (const point of series ?? []) {
      const existing = byPeriod.get(point.period) ?? {
        period: point.period,
        grossMargin: null,
        operatingMargin: null,
        netMargin: null
      };
      existing[key] = point.v;
      byPeriod.set(point.period, existing);
    }
  };
  addSeries(quarterly.grossMargin, "grossMargin");
  addSeries(quarterly.operatingMargin, "operatingMargin");
  addSeries(quarterly.netMargin, "netMargin");

  // Finnhub's series is newest-first; take the most recent 12 quarters and
  // reverse to chronological for a left-to-right chart.
  return Array.from(byPeriod.values())
    .sort((a, b) => (a.period < b.period ? 1 : -1))
    .slice(0, 12)
    .reverse();
}

export type AnalystRating = {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
};

export async function getAnalystRatings(symbol: string): Promise<AnalystRating[]> {
  const response = await throttledFetch(
    `https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(symbol)}&token=${apiKey()}`
  );
  if (!response.ok) {
    throw new Error(`Finnhub recommendation request failed: ${response.status}`);
  }
  const data = (await response.json()) as Array<{
    period?: string;
    strongBuy?: number;
    buy?: number;
    hold?: number;
    sell?: number;
    strongSell?: number;
  }>;
  if (!Array.isArray(data)) return [];
  return data
    .filter((d) => d.period)
    .map((d) => ({
      period: d.period as string,
      strongBuy: d.strongBuy ?? 0,
      buy: d.buy ?? 0,
      hold: d.hold ?? 0,
      sell: d.sell ?? 0,
      strongSell: d.strongSell ?? 0
    }))
    .reverse();
}
