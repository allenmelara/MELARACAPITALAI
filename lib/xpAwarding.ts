import { createServiceClient } from "@/lib/supabase/service";
import type { XpEventType } from "@/lib/xpCalc";

// Service-role — only ever called from the daily cron route
// (app/api/cron/daily/route.ts) after it has verified CRON_SECRET, same
// trust boundary as lib/notifications.ts's createNotification.
//
// dedupeKey works exactly like createNotification's: pass a value unique
// per verified event (e.g. `streak_milestone:savings:6`) and the insert
// becomes a no-op if that exact (user, dedupeKey) pair was already awarded,
// via xp_events' unique(user_id, dedupe_key) constraint. This is what keeps
// XP append-only in practice — a condition that's still true on the next
// cron run never re-awards.
//
// Returns whether a row was actually inserted, so callers can gate a
// level-up notification on a genuinely new award.
export async function awardXp(
  userId: string,
  params: { eventType: XpEventType; xpAmount: number; dedupeKey: string }
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("xp_events")
    .upsert(
      { user_id: userId, event_type: params.eventType, xp_amount: params.xpAmount, dedupe_key: params.dedupeKey },
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
    )
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
