import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { logError, logWarn } from "@/lib/logger";

export const runtime = "nodejs";

function planFromPriceId(priceId: string | undefined): "pro" | "business" | null {
  if (priceId && priceId === process.env.STRIPE_PRICE_ID_PRO) return "pro";
  if (priceId && priceId === process.env.STRIPE_PRICE_ID_BUSINESS) return "business";
  return null;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    logWarn("stripe.webhook.signature", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.supabase_user_id;

        if (userId && typeof session.customer === "string") {
          const stripe = getStripeClient();
          const subscriptionId =
            typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
          const priceId = subscriptionId
            ? (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0]?.price.id
            : undefined;
          const plan = planFromPriceId(priceId) ?? "pro";

          await supabase
            .from("profiles")
            .update({
              plan,
              stripe_customer_id: session.customer,
              stripe_subscription_id: subscriptionId ?? null,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", userId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const priceId = subscription.items.data[0]?.price.id;
        const plan =
          subscription.status === "active" || subscription.status === "trialing"
            ? (planFromPriceId(priceId) ?? "pro")
            : "free";

        const update = supabase
          .from("profiles")
          .update({ plan, stripe_subscription_id: subscription.id, updated_at: new Date().toISOString() });

        if (userId) {
          await update.eq("user_id", userId);
        } else if (typeof subscription.customer === "string") {
          await update.eq("stripe_customer_id", subscription.customer);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        const update = supabase
          .from("profiles")
          .update({ plan: "free", stripe_subscription_id: null, updated_at: new Date().toISOString() });

        if (userId) {
          await update.eq("user_id", userId);
        } else if (typeof subscription.customer === "string") {
          await update.eq("stripe_customer_id", subscription.customer);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logError("stripe.webhook.handle", error);
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }
}
