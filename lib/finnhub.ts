function apiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    throw new Error("FINNHUB_API_KEY is not configured.");
  }
  return key;
}

export type Quote = {
  currentPrice: number;
};

export async function getQuote(symbol: string): Promise<Quote | null> {
  const response = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey()}`
  );
  if (!response.ok) {
    throw new Error(`Finnhub quote request failed: ${response.status}`);
  }
  const data = (await response.json()) as { c?: number };
  if (!data.c || data.c <= 0) return null;
  return { currentPrice: data.c };
}

export type Profile = {
  sharesOutstanding: number | null;
};

export async function getProfile(symbol: string): Promise<Profile | null> {
  const response = await fetch(
    `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey()}`
  );
  if (!response.ok) {
    throw new Error(`Finnhub profile request failed: ${response.status}`);
  }
  const data = (await response.json()) as { shareOutstanding?: number };
  if (!data.shareOutstanding) return null;
  // Finnhub reports shareOutstanding in millions.
  return { sharesOutstanding: data.shareOutstanding * 1_000_000 };
}
