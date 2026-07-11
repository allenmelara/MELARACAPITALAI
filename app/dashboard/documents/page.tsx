import DocumentAnalyzer from "@/components/DocumentAnalyzer";
import { getPlan } from "@/lib/profile";
import { PLAN_LIMITS, documentCharLimit } from "@/lib/limits";
import { countUsageSince, startOfCurrentMonthIso } from "@/lib/usage";

export default async function DocumentsPage() {
  const plan = await getPlan();
  const uploadsUsed = await countUsageSince("document", startOfCurrentMonthIso());
  const limits = PLAN_LIMITS[plan];

  return (
    <DocumentAnalyzer
      plan={plan}
      maxChars={documentCharLimit(plan)}
      maxPages={limits.documentMaxPages}
      uploadsUsed={uploadsUsed}
      uploadsLimit={limits.documentUploadsPerMonth}
    />
  );
}
