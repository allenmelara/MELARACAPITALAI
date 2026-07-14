import { createClient } from "@/lib/supabase/server";

export type RealEstateHolding = {
  id: string;
  name: string;
  estimatedValue: number;
  mortgageBalance: number;
  createdAt: string;
};

export async function listRealEstateHoldings(): Promise<RealEstateHolding[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("real_estate_holdings")
    .select("id, name, estimated_value, mortgage_balance, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((h) => ({
    id: h.id,
    name: h.name,
    estimatedValue: Number(h.estimated_value),
    mortgageBalance: Number(h.mortgage_balance),
    createdAt: h.created_at
  }));
}

export async function addRealEstateHolding(
  userId: string,
  params: { name: string; estimatedValue: number; mortgageBalance?: number }
): Promise<RealEstateHolding> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("real_estate_holdings")
    .insert({
      user_id: userId,
      name: params.name,
      estimated_value: params.estimatedValue,
      mortgage_balance: params.mortgageBalance ?? 0
    })
    .select("id, name, estimated_value, mortgage_balance, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    estimatedValue: Number(data.estimated_value),
    mortgageBalance: Number(data.mortgage_balance),
    createdAt: data.created_at
  };
}

export async function updateRealEstateHolding(
  id: string,
  params: { name?: string; estimatedValue?: number; mortgageBalance?: number }
): Promise<void> {
  const supabase = await createClient();
  const row: Record<string, unknown> = {};
  if (params.name !== undefined) row.name = params.name;
  if (params.estimatedValue !== undefined) row.estimated_value = params.estimatedValue;
  if (params.mortgageBalance !== undefined) row.mortgage_balance = params.mortgageBalance;
  const { error } = await supabase.from("real_estate_holdings").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteRealEstateHolding(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("real_estate_holdings").delete().eq("id", id);
  if (error) throw error;
}

export async function getTotalRealEstateEquity(): Promise<number> {
  const holdings = await listRealEstateHoldings();
  return holdings.reduce((sum, h) => sum + (h.estimatedValue - h.mortgageBalance), 0);
}
