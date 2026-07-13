import { createClient } from "@/lib/supabase/server";

export type DebtType = "credit_card" | "student_loan" | "auto_loan" | "mortgage" | "personal_loan" | "other";

export type Debt = {
  id: string;
  name: string;
  debtType: DebtType;
  balance: number;
  interestRate: number | null;
  minimumPayment: number | null;
  createdAt: string;
};

export async function listDebts(): Promise<Debt[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("debts")
    .select("id, name, debt_type, balance, interest_rate, minimum_payment, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    debtType: d.debt_type,
    balance: Number(d.balance),
    interestRate: d.interest_rate !== null ? Number(d.interest_rate) : null,
    minimumPayment: d.minimum_payment !== null ? Number(d.minimum_payment) : null,
    createdAt: d.created_at
  }));
}

export async function addDebt(
  userId: string,
  params: { name: string; debtType: DebtType; balance: number; interestRate?: number; minimumPayment?: number }
): Promise<Debt> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("debts")
    .insert({
      user_id: userId,
      name: params.name,
      debt_type: params.debtType,
      balance: params.balance,
      interest_rate: params.interestRate ?? null,
      minimum_payment: params.minimumPayment ?? null
    })
    .select("id, name, debt_type, balance, interest_rate, minimum_payment, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    debtType: data.debt_type,
    balance: Number(data.balance),
    interestRate: data.interest_rate !== null ? Number(data.interest_rate) : null,
    minimumPayment: data.minimum_payment !== null ? Number(data.minimum_payment) : null,
    createdAt: data.created_at
  };
}

export async function deleteDebt(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("debts").delete().eq("id", id);
  if (error) throw error;
}

export async function getTotalDebt(): Promise<number> {
  const debts = await listDebts();
  return debts.reduce((sum, d) => sum + d.balance, 0);
}

// The pure calculateDebtPayoff calculator lives in lib/debtCalc.ts, split out
// so client components can import it without pulling this file's
// supabase/server (next/headers) dependency into the browser bundle.
export { calculateDebtPayoff, type DebtPayoffPoint } from "@/lib/debtCalc";
