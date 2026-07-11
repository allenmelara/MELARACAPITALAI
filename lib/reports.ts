import { createClient } from "@/lib/supabase/server";

export type ReportModule = "company" | "document" | "wealth" | "real_estate";

export type Report = {
  id: string;
  title: string;
  module: ReportModule;
  input: unknown;
  output: string;
  created_at: string;
};

// All queries below rely on the caller using the cookie-scoped server client,
// so Row Level Security (auth.uid() = user_id) is what actually restricts
// results to the current user — these helpers never take a userId to filter by.

export async function listReports(): Promise<Report[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, title, module, input, output, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function countReportsSince(sinceIso: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso);
  if (error) throw error;
  return count ?? 0;
}

export async function countAllReports(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("reports").select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function createReport(
  userId: string,
  params: { title: string; module: ReportModule; input?: unknown; output: string }
): Promise<Report> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: userId,
      title: params.title,
      module: params.module,
      input: params.input ?? {},
      output: params.output
    })
    .select("id, title, module, input, output, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function renameReport(id: string, title: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("reports").update({ title }).eq("id", id);
  if (error) throw error;
}

export async function deleteReport(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) throw error;
}
