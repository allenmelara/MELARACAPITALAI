import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { getWatchlistWithQuotes, addWatchlistItem, listWatchlistItems } from "@/lib/watchlist";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const MAX_WATCHLIST_ITEMS = 30;

const createSchema = z.object({
  symbol: z
    .string()
    .trim()
    .regex(/^[A-Za-z.\-]{1,10}$/, "Enter a valid ticker symbol.")
});

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const items = await getWatchlistWithQuotes();
    return NextResponse.json({ items });
  } catch (error) {
    logError("watchlist.list", error);
    return NextResponse.json({ error: "Failed to load watchlist." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`watchlist:create:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid symbol." }, { status: 400 });
  }

  try {
    const existing = await listWatchlistItems();
    if (existing.length >= MAX_WATCHLIST_ITEMS) {
      return NextResponse.json({ error: `You can watch up to ${MAX_WATCHLIST_ITEMS} symbols.` }, { status: 402 });
    }
    if (existing.some((w) => w.symbol === parsed.data.symbol.toUpperCase())) {
      return NextResponse.json({ error: "Already on your watchlist." }, { status: 409 });
    }

    const item = await addWatchlistItem(user.id, parsed.data.symbol);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    logError("watchlist.create", error);
    return NextResponse.json({ error: "Failed to add to watchlist." }, { status: 500 });
  }
}
