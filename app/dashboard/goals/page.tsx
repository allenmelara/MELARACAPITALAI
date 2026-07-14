import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { listGoals, syncLinkedGoalProgress } from "@/lib/financialGoals";
import { listCashAccounts } from "@/lib/cashAccounts";
import { getNetWorthSummary } from "@/lib/netWorth";
import GoalsTracker from "@/components/GoalsTracker";

export default async function GoalsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const initialGoals = await listGoals();

  // Same auto-sync as the dashboard home page — needed here too since this
  // page (not the home dashboard) is where the manual "Update progress"
  // input lives, and a user can land here directly without ever visiting
  // /dashboard first.
  if (initialGoals.some((g) => g.category === "emergency_fund" || g.category === "retirement")) {
    const [cashAccounts, netWorth] = await Promise.all([listCashAccounts(), getNetWorthSummary(user.id)]);
    const emergencyFundFlagged = cashAccounts.filter((a) => a.accountType === "emergency_fund");
    const emergencyFundCash =
      emergencyFundFlagged.length > 0
        ? emergencyFundFlagged.reduce((sum, a) => sum + a.balance, 0)
        : cashAccounts.reduce((sum, a) => sum + a.balance, 0);
    await syncLinkedGoalProgress({ emergencyFundCash, investmentsTotal: netWorth.investments });
  }

  const goals = await listGoals();
  return <GoalsTracker initialGoals={goals} />;
}
