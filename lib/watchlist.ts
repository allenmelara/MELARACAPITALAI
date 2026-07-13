import { createClient } from "@/lib/supabase/server";
import { getQuoteChange } from "@/lib/finnhub";
import { logWarn } from "@/lib/logger";

export type WatchlistItem = {
  id: string;
  symbol: string;
  createdAt: string;
};

export async function listWatchlistItems(): Promise<WatchlistItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("id, symbol, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((w) => ({ id: w.id, symbol: w.symbol, createdAt: w.created_at }));
}

export async function addWatchlistItem(userId: string, symbol: string): Promise<WatchlistItem> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlist_items")
    .insert({ user_id: userId, symbol: symbol.toUpperCase() })
    .select("id, symbol, created_at")
    .single();
  if (error) throw error;
  return { id: data.id, symbol: data.symbol, createdAt: data.created_at };
}

export async function deleteWatchlistItem(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("watchlist_items").delete().eq("id", id);
  if (error) throw error;
}

export type WatchlistQuote = WatchlistItem & { price: number | null; changePercent: number | null };

export async function getWatchlistWithQuotes(): Promise<WatchlistQuote[]> {
  const items = await listWatchlistItems();
  return Promise.all(
    items.map(async (item) => {
      try {
        const quote = await getQuoteChange(item.symbol);
        return { ...item, price: quote?.price ?? null, changePercent: quote?.changePercent ?? null };
      } catch (error) {
        logWarn(`watchlist.quote.${item.symbol}`, error);
        return { ...item, price: null, changePercent: null };
      }
    })
  );
}
