import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";
import { getProfile } from "@/lib/profile";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const profile = await getProfile();
    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account found yet." }, { status: 400 });
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logError("stripe.portal", error);
    return NextResponse.json({ error: "Failed to open billing portal." }, { status: 500 });
  }
}
