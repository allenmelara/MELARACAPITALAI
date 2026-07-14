import { createClient } from "@/lib/supabase/server";

export type Bill = {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string | null;
  autopay: boolean;
  createdAt: string;
};

export async function listBills(): Promise<Bill[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bills")
    .select("id, name, amount, due_day, category, autopay, created_at")
    .order("due_day", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    amount: Number(b.amount),
    dueDay: b.due_day,
    category: b.category,
    autopay: b.autopay,
    createdAt: b.created_at
  }));
}

export async function addBill(
  userId: string,
  params: { name: string; amount: number; dueDay: number; category?: string; autopay?: boolean }
): Promise<Bill> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bills")
    .insert({
      user_id: userId,
      name: params.name,
      amount: params.amount,
      due_day: params.dueDay,
      category: params.category ?? null,
      autopay: params.autopay ?? false
    })
    .select("id, name, amount, due_day, category, autopay, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    amount: Number(data.amount),
    dueDay: data.due_day,
    category: data.category,
    autopay: data.autopay,
    createdAt: data.created_at
  };
}

export async function updateBill(
  id: string,
  params: { name?: string; amount?: number; dueDay?: number; category?: string; autopay?: boolean }
): Promise<void> {
  const supabase = await createClient();
  const row: Record<string, unknown> = {};
  if (params.name !== undefined) row.name = params.name;
  if (params.amount !== undefined) row.amount = params.amount;
  if (params.dueDay !== undefined) row.due_day = params.dueDay;
  if (params.category !== undefined) row.category = params.category;
  if (params.autopay !== undefined) row.autopay = params.autopay;
  const { error } = await supabase.from("bills").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteBill(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("bills").delete().eq("id", id);
  if (error) throw error;
}

export type UpcomingBill = Bill & { nextDueDate: string };

// Bills only store a day-of-month, not a specific date, so "upcoming" is
// computed here: the next occurrence of due_day from today (this month if it
// hasn't passed yet, otherwise next month).
export function withNextDueDate(bills: Bill[], today: Date = new Date()): UpcomingBill[] {
  return bills
    .map((b) => {
      const year = today.getFullYear();
      const month = today.getMonth();
      const day = today.getDate();
      const daysInThisMonth = new Date(year, month + 1, 0).getDate();
      const dueDayThisMonth = Math.min(b.dueDay, daysInThisMonth);
      let next = new Date(year, month, dueDayThisMonth);
      if (dueDayThisMonth < day) {
        const daysInNextMonth = new Date(year, month + 2, 0).getDate();
        next = new Date(year, month + 1, Math.min(b.dueDay, daysInNextMonth));
      }
      return { ...b, nextDueDate: next.toISOString().slice(0, 10) };
    })
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
}
