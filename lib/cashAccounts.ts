import { createClient } from "@/lib/supabase/server";

export type CashAccountType = "checking" | "savings" | "emergency_fund" | "other";

export type CashAccount = {
  id: string;
  name: string;
  accountType: CashAccountType;
  balance: number;
  createdAt: string;
};

// RLS (auth.uid() = user_id) scopes reads; only insert needs an explicit
// userId since RLS can't infer it there — same convention as lib/portfolio.ts.

export async function listCashAccounts(): Promise<CashAccount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cash_accounts")
    .select("id, name, account_type, balance, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    accountType: a.account_type,
    balance: Number(a.balance),
    createdAt: a.created_at
  }));
}

export async function addCashAccount(
  userId: string,
  params: { name: string; accountType: CashAccountType; balance: number }
): Promise<CashAccount> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cash_accounts")
    .insert({ user_id: userId, name: params.name, account_type: params.accountType, balance: params.balance })
    .select("id, name, account_type, balance, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    accountType: data.account_type,
    balance: Number(data.balance),
    createdAt: data.created_at
  };
}

export async function updateCashAccount(
  id: string,
  params: { name?: string; accountType?: CashAccountType; balance?: number }
): Promise<void> {
  const supabase = await createClient();
  const row: Record<string, unknown> = {};
  if (params.name !== undefined) row.name = params.name;
  if (params.accountType !== undefined) row.account_type = params.accountType;
  if (params.balance !== undefined) row.balance = params.balance;
  const { error } = await supabase.from("cash_accounts").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteCashAccount(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("cash_accounts").delete().eq("id", id);
  if (error) throw error;
}

export async function getTotalCash(): Promise<{ total: number; emergencyFund: number }> {
  const accounts = await listCashAccounts();
  const total = accounts.reduce((sum, a) => sum + a.balance, 0);
  const emergencyFlagged = accounts.filter((a) => a.accountType === "emergency_fund");
  const emergencyFund = emergencyFlagged.length > 0 ? emergencyFlagged.reduce((sum, a) => sum + a.balance, 0) : total;
  return { total, emergencyFund };
}
