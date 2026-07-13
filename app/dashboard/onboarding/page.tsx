import { getFinancialProfile } from "@/lib/financialProfile";
import OnboardingWizard from "@/components/OnboardingWizard";

export default async function OnboardingPage() {
  const profile = await getFinancialProfile();
  return <OnboardingWizard initialProfile={profile} />;
}
