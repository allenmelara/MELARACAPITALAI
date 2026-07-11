import { createClient } from "@/lib/supabase/server";

export type Plan = "free" | "pro" | "business";

export type Profile = {
  user_id: string;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, plan, stripe_customer_id, stripe_subscription_id")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPlan(): Promise<Plan> {
  const profile = await getProfile();
  return profile?.plan ?? "free";
}
