import { createClient } from "@/lib/supabase/server";

export type UsageKind = "analyze" | "chat";

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
