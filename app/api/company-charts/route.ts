import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { getEarningsHistory, getMarginHistory, getAnalystRatings } from "@/lib/finnhub";
import { getPriceHistory } from "@/lib/yahooFinance";
import { getCached, setCached } from "@/lib/ttlCache";
import { checkRateLimit } from "@/lib/rateLimit";
import { logWarn, logError } from "@/lib/logger";

export const runtime = "nodejs";

const CACHE_TTL_MS = 60 * 60 * 1000;

const tickerSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z.\-]{1,10}$/, "Enter a valid ticker symbol.");

export type CompanyChartsData = {
  priceHistory: Awaited<ReturnType<typeof getPriceHistory>>;
  earnings: Awaited<ReturnType<typeof getEarningsHistory>>;
  margins: Awaited<ReturnType<typeof getMarginHistory>>;
  analystRatings: Awaited<ReturnType<typeof getAnalystRatings>>;
};

async function getCompanyChartsData(symbol: string): Promise<CompanyChartsData> {
  const cacheKey = `company-charts:${symbol}`;
  const cached = getCached<CompanyChartsData>(cacheKey);
  if (cached) return cached;

  const [priceHistory, earnings, margins, analystRatings] = await Promise.all([
    getPriceHistory(symbol, "5y").catch((error) => {
      logWarn(`companyCharts.price.${symbol}`, error);
      return [];
    }),
    getEarningsHistory(symbol).catch((error) => {
      logWarn(`companyCharts.earnings.${symbol}`, error);
      return [];
    }),
    getMarginHistory(symbol).catch((error) => {
      logWarn(`companyCharts.margins.${symbol}`, error);
      return [];
    }),
    getAnalystRatings(symbol).catch((error) => {
      logWarn(`companyCharts.analyst.${symbol}`, error);
      return [];
    })
  ]);

  const data: CompanyChartsData = { priceHistory, earnings, margins, analystRatings };
  setCached(cacheKey, data, CACHE_TTL_MS);
  return data;
}

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`company-charts:${user.id}`, 40, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = tickerSchema.safeParse(searchParams.get("ticker"));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid ticker symbol." }, { status: 400 });
  }

  try {
    const data = await getCompanyChartsData(parsed.data.toUpperCase());
    return NextResponse.json({ data });
  } catch (error) {
    logError("companyCharts.get", error);
    return NextResponse.json({ error: "Failed to load charts." }, { status: 500 });
  }
}
