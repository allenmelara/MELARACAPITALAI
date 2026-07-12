import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { getPortfolioSummary, addHolding, listHoldings } from "@/lib/portfolio";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const MAX_HOLDINGS = 50;

const createSchema = z.object({
  symbol: z
    .string()
    .trim()
    .regex(/^[A-Za-z.\-]{1,10}$/, "Enter a valid ticker symbol."),
  shares: z.number().positive().max(1_000_000_000),
  costBasis: z.number().min(0).max(1_000_000_000)
});

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const summary = await getPortfolioSummary(user.id);
    return NextResponse.json({ summary });
  } catch (error) {
    logError("portfolio.summary", error);
    return NextResponse.json({ error: "Failed to load portfolio." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`portfolio:create:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid holding." }, { status: 400 });
  }

  try {
    const existing = await listHoldings();
    if (existing.length >= MAX_HOLDINGS) {
      return NextResponse.json({ error: `You can track up to ${MAX_HOLDINGS} holdings.` }, { status: 402 });
    }

    const holding = await addHolding(user.id, parsed.data);
    return NextResponse.json({ holding }, { status: 201 });
  } catch (error) {
    logError("portfolio.create", error);
    return NextResponse.json({ error: "Failed to add holding." }, { status: 500 });
  }
}
