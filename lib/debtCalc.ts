import type { Debt } from "@/lib/debts";

// Pure calculator, deliberately kept dependency-free (no supabase/server
// import anywhere in this file) so client components (DebtPayoffChart) can
// import it directly without pulling a server-only module into the browser
// bundle — see lib/debts.ts for the CRUD half of this feature.

export type DebtPayoffPoint = { month: number; totalBalance: number };

const MAX_MONTHS = 360;

export function calculateDebtPayoff(
  debts: Debt[],
  extraMonthlyPayment = 0
): { series: DebtPayoffPoint[]; payoffMonths: Record<string, number | null> } {
  const balances = new Map(debts.map((d) => [d.id, d.balance]));
  const payoffMonths: Record<string, number | null> = {};
  for (const d of debts) payoffMonths[d.id] = d.balance <= 0 ? 0 : null;

  const series: DebtPayoffPoint[] = [{ month: 0, totalBalance: debts.reduce((s, d) => s + d.balance, 0) }];

  let extraRemaining = extraMonthlyPayment;
  for (let month = 1; month <= MAX_MONTHS; month++) {
    let allPaidOff = true;
    for (const d of debts) {
      let balance = balances.get(d.id) ?? 0;
      if (balance <= 0) continue;
      allPaidOff = false;

      const monthlyRate = (d.interestRate ?? 0) / 100 / 12;
      const interest = balance * monthlyRate;
      const payment = (d.minimumPayment ?? 0) + (month === 1 ? extraRemaining : 0);
      balance = Math.max(0, balance + interest - payment);
      balances.set(d.id, balance);

      if (balance === 0 && payoffMonths[d.id] === null) payoffMonths[d.id] = month;
    }

    extraRemaining = 0; // one-time extra payment applied in month 1 only, kept simple for v1
    const totalBalance = Array.from(balances.values()).reduce((s, b) => s + b, 0);
    series.push({ month, totalBalance });
    if (allPaidOff) break;
  }

  return { series, payoffMonths };
}
