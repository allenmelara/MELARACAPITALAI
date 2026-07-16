import DocumentAnalyzer from "@/components/DocumentAnalyzer";
import { getPlan } from "@/lib/profile";
import { PLAN_LIMITS, documentCharLimit } from "@/lib/limits";
import { countUsageSince, startOfCurrentMonthIso } from "@/lib/usage";
import { listCashAccounts } from "@/lib/cashAccounts";
import { listDebts } from "@/lib/debts";
import { listBills } from "@/lib/bills";
import { listHoldings } from "@/lib/portfolio";

export default async function DocumentsPage() {
  const [plan, uploadsUsed, existingCashAccounts, existingDebts, existingBills, existingHoldings] = await Promise.all([
    getPlan(),
    countUsageSince("document", startOfCurrentMonthIso()),
    listCashAccounts(),
    listDebts(),
    listBills(),
    listHoldings()
  ]);
  const limits = PLAN_LIMITS[plan];

  return (
    <DocumentAnalyzer
      plan={plan}
      maxChars={documentCharLimit(plan)}
      maxPages={limits.documentMaxPages}
      uploadsUsed={uploadsUsed}
      uploadsLimit={limits.documentUploadsPerMonth}
      existingCashAccounts={existingCashAccounts}
      existingDebts={existingDebts}
      existingBills={existingBills}
      existingHoldings={existingHoldings}
    />
  );
}
