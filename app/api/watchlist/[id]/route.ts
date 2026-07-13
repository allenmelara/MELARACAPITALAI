import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { deleteWatchlistItem } from "@/lib/watchlist";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

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
