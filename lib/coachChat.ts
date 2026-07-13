import { createClient } from "@/lib/supabase/server";

export type CoachMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export async function listCoachMessages(limit = 50): Promise<CoachMessage[]> {
  const supabase = await createClient();
  // Descending + limit, then reverse — returns the most recent `limit`
  // messages in chronological order (an ascending order-then-limit would
  // instead return the *oldest* messages once a conversation exceeds `limit`).
  const { data, error } = await supabase
    .from("coach_messages")
    .select("id, role, content, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).reverse();
}

export async function createCoachMessage(params: {
  userId: string;
  role: "user" | "assistant";
  content: string;
}): Promise<CoachMessage> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_messages")
    .insert({ user_id: params.userId, role: params.role, content: params.content })
    .select("id, role, content, created_at")
    .single();
  if (error) throw error;
  return data;
}
