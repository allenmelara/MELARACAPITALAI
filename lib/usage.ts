import { createClient } from "@/lib/supabase/server";

export type UsageKind = "analyze" | "chat" | "document";

export async function countUsageSince(kind: UsageKind, sinceIso: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .gte("created_at", sinceIso);
  if (error) throw error;
  return count ?? 0;
}

export async function recordUsage(userId: string, kind: UsageKind): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("usage_events").insert({ user_id: userId, kind });
  if (error) throw error;
}

export function startOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export type UsageEvent = { kind: UsageKind; created_at: string };

// Raw usage rows since a given date, for building the usage-analytics
// breakdown (Business plan). Aggregated in JS rather than via a DB function,
// since the volume here is small (one row per billable AI call).
export async function listUsageSince(sinceIso: string): Promise<UsageEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("usage_events")
    .select("kind, created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
