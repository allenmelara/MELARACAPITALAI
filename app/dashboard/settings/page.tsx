import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { getPlan, getProfile } from "@/lib/profile";
import { getFinancialProfile } from "@/lib/financialProfile";
import { PLAN_LIMITS } from "@/lib/limits";
import { countUsageSince, startOfCurrentMonthIso } from "@/lib/usage";
import { signOutAction } from "@/app/auth/actions";
import UsageBar from "@/components/UsageBar";
import BrandingForm from "@/components/BrandingForm";
import FinancialProfilePrivacyPanel from "@/components/FinancialProfilePrivacyPanel";

const PLAN_LABELS = { free: "Free", pro: "Pro", business: "Business" };

export default async function SettingsPage() {
  const user = await getUser();
  const [plan, profile, financialProfile] = await Promise.all([getPlan(), getProfile(), getFinancialProfile()]);
  const limits = PLAN_LIMITS[plan];
  const sinceIso = startOfCurrentMonthIso();
  const [creditsUsed, chatUsed, documentsUsed] = await Promise.all([
    countUsageSince("analyze", sinceIso),
    countUsageSince("chat", sinceIso),
    countUsageSince("document", sinceIso)
  ]);

  return (
    <>
      <section className="dash-header">
        <h1>Settings</h1>
        <p>Your account details, plan, and usage.</p>
      </section>

      <div className="panel">
        <div className="form-grid">
          <label className="full">
            Email
            <input value={user?.email ?? ""} disabled />
          </label>
          <label className="full">
            Current plan
            <input value={PLAN_LABELS[plan]} disabled />
          </label>
        </div>
        <div className="actions">
          <Link href="/pricing" className="secondary">
            Manage billing
          </Link>
          {plan === "business" && (
            <Link href="/dashboard/usage" className="secondary">
              Usage analytics
            </Link>
          )}
          <form action={signOutAction}>
            <button className="secondary" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>This month&apos;s usage</h2>
        <div className="usage-bar-grid">
          <UsageBar label="AI Research Credits" used={creditsUsed} limit={limits.aiResearchCredits} />
          <UsageBar label="AI chat messages" used={chatUsed} limit={limits.chatMessagesPerMonth} />
          <UsageBar label="Document uploads" used={documentsUsed} limit={limits.documentUploadsPerMonth} />
        </div>
      </div>

      <FinancialProfilePrivacyPanel profile={financialProfile} />

      {plan === "business" && (
        <div className="panel" style={{ marginTop: 20 }}>
          <h2 style={{ marginTop: 0 }}>White-label PDF branding</h2>
          <p className="disclaimer">
            Set a company name and logo to replace Melara Capital AI branding on your exported PDF
            reports.
          </p>
          <BrandingForm
            initialBrandName={profile?.brand_name ?? ""}
            initialBrandLogoUrl={profile?.brand_logo_url ?? ""}
          />
        </div>
      )}
    </>
  );
}
