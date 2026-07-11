import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";
import { searchSymbols } from "@/lib/finnhub";

export const runtime = "nodejs";

const querySchema = z.string().trim().min(1).max(60);

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`company-search:${user.id}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: "Too many searches. Try again shortly." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(searchParams.get("q"));
  if (!parsed.success) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchSymbols(parsed.data);
    return NextResponse.json({ results });
  } catch (error) {
    logError("company-search", error);
    return NextResponse.json({ error: "Search failed. Try again shortly." }, { status: 502 });
  }
}
