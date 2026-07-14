import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { deleteWatchlistItem, updateWatchlistAlertThreshold } from "@/lib/watchlist";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const updateSchema = z.object({ alertThresholdPct: z.number().min(0).max(100) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`watchlist:update:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid alert threshold." }, { status: 400 });
  }

  try {
    await updateWatchlistAlertThreshold(id, parsed.data.alertThresholdPct);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("watchlist.update", error);
    return NextResponse.json({ error: "Failed to update alert threshold." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteWatchlistItem(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("watchlist.delete", error);
    return NextResponse.json({ error: "Failed to remove from watchlist." }, { status: 500 });
  }
}
