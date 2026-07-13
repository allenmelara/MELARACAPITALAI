import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { getCurrentMonthBudget, getBudgetHistory, upsertMonthBudget, currentMonthKey } from "@/lib/monthlyBudget";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const BUDGET_CATEGORY_MAX = 20;

const putSchema = z.object({
  income: z.number().min(0).max(1_000_000_000),
  categories: z
    .array(z.object({ category: z.string().trim().min(1).max(40), amount: z.number().min(0).max(1_000_000_000) }))
    .max(BUDGET_CATEGORY_MAX)
});

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const [current, history] = await Promise.all([getCurrentMonthBudget(), getBudgetHistory()]);
    return NextResponse.json({ current, history });
  } catch (error) {
    logError("monthlyBudget.get", error);
    return NextResponse.json({ error: "Failed to load your budget." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`monthly-budget:save:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid budget." }, { status: 400 });
  }

  try {
    const budget = await upsertMonthBudget(user.id, { month: currentMonthKey(), ...parsed.data });
    return NextResponse.json({ budget });
  } catch (error) {
    logError("monthlyBudget.save", error);
    return NextResponse.json({ error: "Failed to save your budget." }, { status: 500 });
  }
}
