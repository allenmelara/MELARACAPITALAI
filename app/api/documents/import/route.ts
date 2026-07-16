import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { addCashAccount, updateCashAccount } from "@/lib/cashAccounts";
import { addDebt, updateDebt } from "@/lib/debts";
import { addBill, updateBill } from "@/lib/bills";
import { addHolding, updateHolding, listHoldings } from "@/lib/portfolio";
import { mergeHoldingLot } from "@/lib/portfolioCalc";
import { BUDGET_CATEGORIES } from "@/lib/budgetCalc";
import { checkRateLimit } from "@/lib/rateLimit";
import { logWarn } from "@/lib/logger";

export const runtime = "nodejs";

const MAX_ITEMS = 100;

const baseImportItem = z.object({
  action: z.enum(["add", "update"]),
  targetId: z.string().uuid().optional()
});

const cashAccountImportItem = baseImportItem.extend({
  category: z.literal("cash_account"),
  name: z.string().trim().min(1).max(80),
  accountType: z.enum(["checking", "savings", "emergency_fund", "other"]),
  balance: z.number().min(0).max(1_000_000_000)
});

const debtImportItem = baseImportItem.extend({
  category: z.literal("debt"),
  name: z.string().trim().min(1).max(80),
  debtType: z.enum(["credit_card", "student_loan", "auto_loan", "mortgage", "personal_loan", "other"]),
  balance: z.number().min(0).max(1_000_000_000),
  interestRate: z.number().min(0).max(100).optional(),
  minimumPayment: z.number().min(0).max(1_000_000).optional()
});

const billImportItem = baseImportItem.extend({
  category: z.literal("bill"),
  name: z.string().trim().min(1).max(80),
  amount: z.number().min(0).max(1_000_000),
  dueDay: z.number().int().min(1).max(31),
  billCategory: z.enum(BUDGET_CATEGORIES).optional(),
  autopay: z.boolean().optional()
});

const holdingImportItem = baseImportItem.extend({
  category: z.literal("holding"),
  symbol: z.string().trim().regex(/^[A-Za-z.\-]{1,10}$/, "Enter a valid ticker symbol."),
  shares: z.number().positive().max(1_000_000_000),
  costBasis: z.number().min(0).max(1_000_000_000),
  annualDividendPerShare: z.number().min(0).max(1_000_000).optional()
});

const importItemSchema = z
  .discriminatedUnion("category", [cashAccountImportItem, debtImportItem, billImportItem, holdingImportItem])
  .refine((data) => data.action !== "update" || !!data.targetId, {
    message: "targetId is required when action is update."
  });

const bodySchema = z.object({
  items: z.array(importItemSchema).min(1).max(MAX_ITEMS)
});

type ImportResult = { ok: true; id?: string } | { ok: false; error: string };

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`documents:import:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid import request." }, { status: 400 });
  }

  // No cross-table transaction exists anywhere in this app — report success
  // per item instead of assuming all-or-nothing.
  const results: ImportResult[] = [];

  for (const item of parsed.data.items) {
    try {
      if (item.category === "cash_account") {
        if (item.action === "add") {
          const account = await addCashAccount(user.id, {
            name: item.name,
            accountType: item.accountType,
            balance: item.balance
          });
          results.push({ ok: true, id: account.id });
        } else {
          await updateCashAccount(item.targetId as string, {
            name: item.name,
            accountType: item.accountType,
            balance: item.balance
          });
          results.push({ ok: true, id: item.targetId });
        }
      } else if (item.category === "debt") {
        if (item.action === "add") {
          const debt = await addDebt(user.id, {
            name: item.name,
            debtType: item.debtType,
            balance: item.balance,
            interestRate: item.interestRate,
            minimumPayment: item.minimumPayment
          });
          results.push({ ok: true, id: debt.id });
        } else {
          await updateDebt(item.targetId as string, {
            name: item.name,
            debtType: item.debtType,
            balance: item.balance,
            interestRate: item.interestRate,
            minimumPayment: item.minimumPayment
          });
          results.push({ ok: true, id: item.targetId });
        }
      } else if (item.category === "bill") {
        if (item.action === "add") {
          const bill = await addBill(user.id, {
            name: item.name,
            amount: item.amount,
            dueDay: item.dueDay,
            category: item.billCategory,
            autopay: item.autopay
          });
          results.push({ ok: true, id: bill.id });
        } else {
          await updateBill(item.targetId as string, {
            name: item.name,
            amount: item.amount,
            dueDay: item.dueDay,
            category: item.billCategory,
            autopay: item.autopay
          });
          results.push({ ok: true, id: item.targetId });
        }
      } else {
        if (item.action === "add") {
          const holding = await addHolding(user.id, {
            symbol: item.symbol,
            shares: item.shares,
            costBasis: item.costBasis,
            annualDividendPerShare: item.annualDividendPerShare
          });
          results.push({ ok: true, id: holding.id });
        } else {
          // Re-fetch the current row inside this handler rather than trusting
          // client-supplied "existing" values, to shrink the staleness window
          // before computing the weighted-average merge.
          const holdings = await listHoldings();
          const existing = holdings.find((h) => h.id === item.targetId);
          if (!existing) {
            results.push({ ok: false, error: "That holding no longer exists." });
            continue;
          }
          const merged = mergeHoldingLot(
            { shares: existing.shares, costBasis: existing.costBasis },
            { shares: item.shares, costBasis: item.costBasis }
          );
          await updateHolding(item.targetId as string, {
            shares: merged.shares,
            costBasis: merged.costBasis,
            annualDividendPerShare: item.annualDividendPerShare
          });
          results.push({ ok: true, id: item.targetId });
        }
      }
    } catch (error) {
      logWarn(`documents.import.${item.category}`, error);
      results.push({ ok: false, error: "Failed to import this item." });
    }
  }

  return NextResponse.json({ results });
}
