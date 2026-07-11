import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client bypasses Row Level Security. Only call this from
// trusted server-side code that has already verified its caller (e.g. the
// Stripe webhook, after signature verification) — never wire it to a route
// that acts directly on unauthenticated request input.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role is not configured.");
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
