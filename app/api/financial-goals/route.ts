import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { listGoals, addGoal } from "@/lib/financialGoals";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const MAX_GOALS = 20;

const createSchema = z.object({
  name: z.string().trim().min(1, "Enter a goal name.").max(80),
  category: z
    .enum(["emergency_fund", "retirement", "home", "debt_payoff", "education", "business", "general"])
    .optional(),
  targetAmount: z.number().positive().max(1_000_000_000),
  currentAmount: z.number().min(0).max(1_000_000_000).optional(),
  targetDate: z.string().date().optional()
});

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const goals = await listGoals();
    return NextResponse.json({ goals });
  } catch (error) {
    logError("financialGoals.list", error);
    return NextResponse.json({ error: "Failed to load goals." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`financial-goals:create:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid goal." }, { status: 400 });
  }

  try {
    const existing = await listGoals();
    if (existing.length >= MAX_GOALS) {
      return NextResponse.json({ error: `You can track up to ${MAX_GOALS} goals.` }, { status: 402 });
    }

    const goal = await addGoal(user.id, parsed.data);
    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    logError("financialGoals.create", error);
    return NextResponse.json({ error: "Failed to add goal." }, { status: 500 });
  }
}
