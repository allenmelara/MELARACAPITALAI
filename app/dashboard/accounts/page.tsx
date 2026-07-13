import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { listCashAccounts } from "@/lib/cashAccounts";
import { listDebts } from "@/lib/debts";
import { listBills } from "@/lib/bills";
import { listRealEstateHoldings } from "@/lib/realEstateHoldings";
import CashAccountsSection from "@/components/dashboard/CashAccountsSection";
import DebtsSection from "@/components/dashboard/DebtsSection";
import BillsSection from "@/components/dashboard/BillsSection";
import RealEstateHoldingsSection from "@/components/dashboard/RealEstateHoldingsSection";

export default async function AccountsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const [cashAccounts, debts, bills, realEstateHoldings] = await Promise.all([
    listCashAccounts(),
    listDebts(),
    listBills(),
    listRealEstateHoldings()
  ]);

  return (
    <>
      <section className="dash-header">
        <h1>Accounts & Bills</h1>
        <p>Manually tracked cash, debt, real estate, and recurring bills — no bank account is connected.</p>
      </section>

      <CashAccountsSection initialAccounts={cashAccounts} />
      <DebtsSection initialDebts={debts} />
      <RealEstateHoldingsSection initialHoldings={realEstateHoldings} />
      <BillsSection initialBills={bills} />
    </>
  );
}
