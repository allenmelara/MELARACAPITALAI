import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError, logWarn } from "@/lib/logger";
import {
  resolveTickerToCik,
  getCompanyFacts,
  extractCompanyInputsFromFacts,
  extractFinancialStatements,
  getRecentFilings,
  type SourceStatus
} from "@/lib/secEdgar";
import { getQuote, getProfile } from "@/lib/finnhub";

export const runtime = "nodejs";

const tickerSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z.\-]{1,10}$/, "Enter a valid ticker symbol.");

type FieldSource = SourceStatus | "live";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`company-lookup:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many lookups. Try again later." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = tickerSchema.safeParse(searchParams.get("ticker"));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid ticker symbol." }, { status: 400 });
  }
  const ticker = parsed.data.toUpperCase();

  try {
    const resolved = await resolveTickerToCik(ticker);
    if (!resolved) {
      return NextResponse.json({ error: `No SEC filer found for ticker "${ticker}".` }, { status: 404 });
    }

    const [facts, quote, profile, filings] = await Promise.all([
      getCompanyFacts(resolved.cik),
      getQuote(ticker).catch((error) => {
        logWarn("company-lookup.quote", error);
        return null;
      }),
      getProfile(ticker).catch((error) => {
        logWarn("company-lookup.profile", error);
        return null;
      }),
      getRecentFilings(resolved.cik).catch((error) => {
        logWarn("company-lookup.filings", error);
        return [];
      })
    ]);

    const { inputs, sourceNotes } = extractCompanyInputsFromFacts(facts);
    const statements = extractFinancialStatements(facts);
    const combinedSourceNotes: Record<string, FieldSource> = { ...sourceNotes };

    if (quote) {
      inputs.currentPrice = quote.currentPrice;
      combinedSourceNotes.currentPrice = "live";
    } else {
      combinedSourceNotes.currentPrice = "not_found";
    }

    if (!inputs.shares && profile?.sharesOutstanding) {
      inputs.shares = profile.sharesOutstanding;
      combinedSourceNotes.shares = "live";
    }

    return NextResponse.json({
      company: {
        // Prefer Finnhub's common name ("Apple Inc") over the SEC legal title
        // ("APPLE INC") when available, so the selection UI reads naturally.
        name: profile?.name || resolved.name,
        ticker,
        exchange: profile?.exchange ?? null,
        industry: profile?.industry ?? null,
        logo: profile?.logo ?? null
      },
      inputs,
      sourceNotes: combinedSourceNotes,
      statements,
      filings,
      asOf: new Date().toISOString()
    });
  } catch (error) {
    logError("company-lookup", error);
    return NextResponse.json({ error: "Lookup failed. Try again shortly." }, { status: 502 });
  }
}
