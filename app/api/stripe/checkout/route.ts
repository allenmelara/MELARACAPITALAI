import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { getStripeClient, PRICE_IDS } from "@/lib/stripe";
import { getProfile } from "@/lib/profile";
import { logError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const bodySchema = z.object({ plan: z.enum(["pro", "business"]) });

export async function POST(request: Request) {
  const user = await getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`stripe:checkout:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const priceId = PRICE_IDS[parsed.data.plan];
  if (!priceId) {
    return NextResponse.json({ error: "This plan is not configured yet." }, { status: 500 });
  }

  try {
    const stripe = getStripeClient();
    const profile = await getProfile();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: profile?.stripe_customer_id ?? undefined,
      customer_email: profile?.stripe_customer_id ? undefined : user.email,
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id },
      subscription_data: { metadata: { supabase_user_id: user.id } },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logError("stripe.checkout", error);
    return NextResponse.json({ error: "Failed to start checkout." }, { status: 500 });
  }
}
