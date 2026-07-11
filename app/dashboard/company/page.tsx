import CompanyAnalyzer from "@/components/CompanyAnalyzer";
import { getPlan } from "@/lib/profile";

export default async function CompanyPage() {
  const plan = await getPlan();
  return <CompanyAnalyzer plan={plan} />;
}
