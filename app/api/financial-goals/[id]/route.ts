import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { updateGoalProgress, deleteGoal } from "@/lib/financialGoals";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const progressSchema = z.object({ currentAmount: z.number().min(0).max(1_000_000_000) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`financial-goals:update:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  }

  const { id } = await params;
  const parsed = progressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid progress amount." }, { status: 400 });
  }

  try {
    await updateGoalProgress(id, parsed.data.currentAmount);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("financialGoals.update", error);
    return NextResponse.json({ error: "Failed to update goal." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteGoal(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("financialGoals.delete", error);
    return NextResponse.json({ error: "Failed to delete goal." }, { status: 500 });
  }
}
