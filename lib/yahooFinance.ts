// Yahoo Finance's undocumented chart endpoint — not an official public API,
// so it could change or start blocking requests without notice. It's the
// only free, no-key source of real historical daily prices we have (Finnhub
// gates /stock/candle behind a paid plan). Failures here should degrade to
// "price history unavailable" rather than break the page.

export type PricePoint = {
  date: string;
  close: number;
};

export async function getPriceHistory(symbol: string, range: "1mo" | "6mo" | "1y" | "5y" = "5y"): Promise<PricePoint[]> {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`,
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  if (!response.ok) {
    throw new Error(`Yahoo Finance chart request failed: ${response.status}`);
  }
  const data = (await response.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
      }>;
      error?: unknown;
    };
  };
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];

  const points: PricePoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close === null || close === undefined) continue;
    points.push({ date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10), close });
  }
  return points;
}
