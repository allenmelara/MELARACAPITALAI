import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type NotificationType =
  | "daily_checkin"
  | "weekly_recap"
  | "monthly_report"
  | "goal_milestone"
  | "streak_milestone"
  | "score_change"
  | "budget_challenge";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

function toNotification(row: {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}): Notification {
  return { id: row.id, type: row.type, title: row.title, body: row.body, readAt: row.read_at, createdAt: row.created_at };
}

// User-scoped (RLS via the cookie-scoped client) — used by the notifications
// API routes for the logged-in user's own inbox.

export async function listNotifications(limit = 50): Promise<Notification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

// Service-role — only ever called from the daily cron route (app/api/cron/daily/route.ts)
// after it has verified CRON_SECRET, since creating a notification for an
// arbitrary user has to bypass RLS (the cron has no per-user session).
export async function createNotification(
  userId: string,
  params: { type: NotificationType; title: string; body: string }
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("notifications")
    .insert({ user_id: userId, type: params.type, title: params.title, body: params.body });
  if (error) throw error;
}
