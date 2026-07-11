import Link from "next/link";
import { Check, Minus, Star } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { PLAN_LIMITS } from "@/lib/limits";
import { countUsageSince, startOfCurrentMonthIso } from "@/lib/usage";
import PricingActions from "@/components/PricingActions";
import UsageBar from "@/components/UsageBar";

type TierId = "free" | "pro" | "business";

const TIERS: Array<{
  id: TierId;
  name: string;
  price: string;
  blurb: string;
  popular?: boolean;
  features: Array<{ text: string; comingSoon?: boolean }>;
  valueStatement?: string;
}> = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    blurb: "Try the workspace.",
    features: [
      { text: `${PLAN_LIMITS.free.aiResearchCredits} AI Research Credits/month` },
      { text: `${PLAN_LIMITS.free.chatMessagesPerMonth} AI chat messages/month` },
      { text: `${PLAN_LIMITS.free.documentUploadsPerMonth} document uploads/month (${PLAN_LIMITS.free.documentMaxPages} pages each)` },
      { text: "Basic DCF and comparable analysis" },
      { text: "Basic real estate calculator" },
      { text: "Wealth planner" },
      { text: "Unlimited saved reports" },
      { text: "Watermarked PDF exports" }
    ]
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29/mo",
    blurb: "For active investors.",
    popular: true,
    valueStatement: "Save 20+ hours of research every month.",
    features: [
      { text: `${PLAN_LIMITS.pro.aiResearchCredits} AI Research Credits/month` },
      { text: "Unlimited AI chat (fair use)" },
      { text: `Unlimited document uploads (up to ${PLAN_LIMITS.pro.documentMaxPages} pages)` },
      { text: "SEC autofill" },
      { text: "Advanced valuation assumptions" },
      { text: "Sensitivity analysis", comingSoon: true },
      { text: "Investment memo generation", comingSoon: true },
      { text: "Professional PDF exports (no watermark)" },
      { text: "Priority AI processing" }
    ]
  },
  {
    id: "business",
    name: "Business",
    price: "$99/mo",
    blurb: "For teams and firms.",
    features: [
      { text: "Unlimited AI Research Credits (fair use)" },
      { text: "Team workspaces", comingSoon: true },
      { text: "Shared reports", comingSoon: true },
      { text: "Shared document library", comingSoon: true },
      { text: "White-label PDF exports" },
      { text: "Admin dashboard", comingSoon: true },
      { text: "Usage analytics" },
      { text: "API access", comingSoon: true },
      { text: "Highest priority processing" }
    ]
  }
];

const COMPARISON_ROWS: Array<{
  label: string;
  free: string | boolean;
  pro: string | boolean;
  business: string | boolean;
}> = [
  { label: "AI Research Credits / month", free: "5", pro: "100", business: "Unlimited" },
  { label: "AI chat messages", free: "50 / month", pro: "Unlimited*", business: "Unlimited*" },
  { label: "Document uploads", free: "3/mo, 25 pages", pro: "Unlimited, 500 pages", business: "Unlimited" },
  { label: "Saved reports", free: "Unlimited", pro: "Unlimited", business: "Unlimited" },
  { label: "SEC autofill", free: false, pro: true, business: true },
  { label: "Advanced valuation assumptions", free: false, pro: true, business: true },
  { label: "PDF exports", free: "Watermarked", pro: "No watermark", business: "White-label" },
  { label: "Team workspaces", free: false, pro: false, business: "Coming soon" },
  { label: "Usage analytics", free: false, pro: false, business: true },
  { label: "Priority AI processing", free: false, pro: true, business: "Highest" }
];

export default async function PricingPage() {
  const user = await getUser();
  const profile = user ? await getProfile() : null;
  const plan = profile?.plan ?? "free";
  const hasSubscription = Boolean(profile?.stripe_customer_id);
  const creditsUsed = user ? await countUsageSince("analyze", startOfCurrentMonthIso()) : 0;

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
          <p>
            Plans built around AI Research Credits, not generic report counts — calculators, saved
            reports, and navigation stay unrestricted on every plan.
          </p>
        </section>
        <section className="pricing-grid">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`hero-card pricing-card ${user && plan === tier.id ? "active" : ""} ${tier.popular ? "pricing-card-popular" : ""}`}
            >
              {tier.popular && (
                <span className="pricing-popular-badge">
                  <Star size={12} /> Most Popular
                </span>
              )}
              <h3>{tier.name}</h3>
              <div className="pricing-price">{tier.price}</div>
              <p className="pricing-blurb">{tier.blurb}</p>
              <ul className="pricing-feature-list">
                {tier.features.map((f) => (
                  <li key={f.text}>
                    <Check size={15} className="pricing-feature-check" />
                    <span>
                      {f.text}
                      {f.comingSoon && <span className="pricing-coming-soon">Coming soon</span>}
                    </span>
                  </li>
                ))}
              </ul>

              {tier.valueStatement && <p className="pricing-value-statement">{tier.valueStatement}</p>}

              {user && plan === tier.id && (
                <UsageBar
                  label="AI Research Credits used this month"
                  used={creditsUsed}
                  limit={PLAN_LIMITS[plan].aiResearchCredits}
                />
              )}

              {tier.id === "free" ? (
                user ? (
                  plan === "free" && <span className="disclaimer">Current plan</span>
                ) : (
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

        <section className="pricing-comparison">
          <h2>Compare plans</h2>
          <div className="pricing-comparison-scroll">
            <table className="pricing-comparison-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Free</th>
                  <th>Pro</th>
                  <th>Business</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <ComparisonCell value={row.free} />
                    <ComparisonCell value={row.pro} />
                    <ComparisonCell value={row.business} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="disclaimer">
            *Unlimited chat is subject to fair use. Document-page limits are estimated from
            character count until PDF-native page parsing ships.
          </p>
        </section>
      </main>
    </div>
  );
}

function ComparisonCell({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <td className="pricing-comparison-yes">
        <Check size={16} />
      </td>
    );
  }
  if (value === false) {
    return (
      <td className="pricing-comparison-no">
        <Minus size={14} />
      </td>
    );
  }
  return <td>{value}</td>;
}
