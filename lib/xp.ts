import { createClient } from "@/lib/supabase/server";
import type { XpEventType } from "@/lib/xpCalc";

// User-scoped (RLS via the cookie-scoped client), read-only — xp_events has
// no insert/update policy for regular users, XP is only ever granted
// server-side from the cron. See lib/xpAwarding.ts for the write half.

export type XpEvent = {
  id: string;
  eventType: XpEventType;
  xpAmount: number;
  createdAt: string;
};

export async function getTotalXp(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("xp_events").select("xp_amount");
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + row.xp_amount, 0);
}

export async function listXpEvents(limit = 20): Promise<XpEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("xp_events")
    .select("id, event_type, xp_amount, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    xpAmount: row.xp_amount,
    createdAt: row.created_at
  }));
}
