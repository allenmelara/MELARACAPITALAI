import { createClient } from "@/lib/supabase/server";

export type ChatMessage = {
  id: string;
  report_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export async function listChatMessages(reportId: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_chat_messages")
    .select("id, report_id, role, content, created_at")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createChatMessage(params: {
  reportId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
}): Promise<ChatMessage> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_chat_messages")
    .insert({
      report_id: params.reportId,
      user_id: params.userId,
      role: params.role,
      content: params.content
    })
    .select("id, report_id, role, content, created_at")
    .single();
  if (error) throw error;
  return data;
}
