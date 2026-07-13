import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { listDebts, addDebt } from "@/lib/debts";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const MAX_DEBTS = 30;

const createSchema = z.object({
  name: z.string().trim().min(1, "Enter a debt name.").max(80),
  debtType: z.enum(["credit_card", "student_loan", "auto_loan", "mortgage", "personal_loan", "other"]),
  balance: z.number().min(0).max(1_000_000_000),
  interestRate: z.number().min(0).max(100).optional(),
  minimumPayment: z.number().min(0).max(1_000_000).optional()
});

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const debts = await listDebts();
    return NextResponse.json({ debts });
  } catch (error) {
    logError("debts.list", error);
    return NextResponse.json({ error: "Failed to load debts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`debts:create:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid debt." }, { status: 400 });
  }

  try {
    const existing = await listDebts();
    if (existing.length >= MAX_DEBTS) {
      return NextResponse.json({ error: `You can track up to ${MAX_DEBTS} debts.` }, { status: 402 });
    }

    const debt = await addDebt(user.id, parsed.data);
    return NextResponse.json({ debt }, { status: 201 });
  } catch (error) {
    logError("debts.create", error);
    return NextResponse.json({ error: "Failed to add debt." }, { status: 500 });
  }
}
