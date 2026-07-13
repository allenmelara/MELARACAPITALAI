import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { listCashAccounts, addCashAccount } from "@/lib/cashAccounts";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const MAX_CASH_ACCOUNTS = 20;

const createSchema = z.object({
  name: z.string().trim().min(1, "Enter an account name.").max(80),
  accountType: z.enum(["checking", "savings", "emergency_fund", "other"]),
  balance: z.number().min(0).max(1_000_000_000)
});

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const accounts = await listCashAccounts();
    return NextResponse.json({ accounts });
  } catch (error) {
    logError("cashAccounts.list", error);
    return NextResponse.json({ error: "Failed to load cash accounts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`cash-accounts:create:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid account." }, { status: 400 });
  }

  try {
    const existing = await listCashAccounts();
    if (existing.length >= MAX_CASH_ACCOUNTS) {
      return NextResponse.json({ error: `You can track up to ${MAX_CASH_ACCOUNTS} cash accounts.` }, { status: 402 });
    }

    const account = await addCashAccount(user.id, parsed.data);
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    logError("cashAccounts.create", error);
    return NextResponse.json({ error: "Failed to add cash account." }, { status: 500 });
  }
}
