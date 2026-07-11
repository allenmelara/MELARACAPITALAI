import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import PricingActions from "@/components/PricingActions";
import { PLAN_LIMITS } from "@/lib/limits";

const TIERS = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    blurb: "Try the workspace.",
    features: [
      `${PLAN_LIMITS.free.reportsPerMonth} AI reports / month`,
      `${PLAN_LIMITS.free.savedReports} saved reports`,
      "All 4 modules"
    ]
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$29/mo",
    blurb: "For active investors.",
    features: [`${PLAN_LIMITS.pro.reportsPerMonth} AI reports / month`, "Unlimited saved reports", "All 4 modules"]
  },
  {
    id: "business" as const,
    name: "Business",
    price: "$99/mo",
    blurb: "For teams and firms.",
    features: ["Unlimited AI reports", "Unlimited saved reports", "All 4 modules"]
  }
];

export default async function PricingPage() {
  const user = await getUser();
  const profile = user ? await getProfile() : null;
  const plan = profile?.plan ?? "free";
  const hasSubscription = Boolean(profile?.stripe_customer_id);

  return (
    <div className="shell">
      <nav className="nav">
        <Link href="/" className="brand">
          Melara Capital <span>AI</span>
        </Link>
        <div className="nav-actions">
          {user ? (
            <Link href="/dashboard" className="secondary">
              Back to workspace
            </Link>
          ) : (
            <>
              <Link href="/login" className="secondary">
                Log in
              </Link>
              <Link href="/signup" className="primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
      <main className="main">
        <section className="dash-header">
          <h1>Pricing</h1>
          <p>Usage-based plans. Upgrade or cancel anytime.</p>
        </section>
        <section className="pricing-grid">
          {TIERS.map((tier) => (
            <div key={tier.id} className={`hero-card pricing-card ${plan === tier.id ? "active" : ""}`}>
              <h3>{tier.name}</h3>
              <div className="pricing-price">{tier.price}</div>
              <p className="pricing-blurb">{tier.blurb}</p>
              <ul>
                {tier.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {tier.id === "free" ? (
                !user && (
                  <Link href="/signup" className="primary">
                    Get started free
                  </Link>
                )
              ) : user ? (
                <PricingActions tierId={tier.id} isCurrent={plan === tier.id} hasSubscription={hasSubscription} />
              ) : (
                <Link href="/signup" className="primary">
                  Sign up to subscribe
                </Link>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
