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

export type RecentChatReport = {
  reportId: string;
  title: string;
  module: string;
  lastMessageAt: string;
};

// Recent reports with chat activity, most-recently-messaged first, deduped
// by report (a report can have many messages but should only show up once).
export async function listRecentChatReports(limit: number): Promise<RecentChatReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_chat_messages")
    .select("report_id, created_at, reports(title, module)")
    .order("created_at", { ascending: false })
    .limit(limit * 10);
  if (error) throw error;

  const seen = new Set<string>();
  const result: RecentChatReport[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.report_id)) continue;
    seen.add(row.report_id);
    const report = row.reports as unknown as { title: string; module: string } | null;
    result.push({
      reportId: row.report_id,
      title: report?.title ?? "Untitled report",
      module: report?.module ?? "company",
      lastMessageAt: row.created_at
    });
    if (result.length >= limit) break;
  }
  return result;
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
