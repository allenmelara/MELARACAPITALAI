import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { deleteCashAccount, updateCashAccount } from "@/lib/cashAccounts";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    accountType: z.enum(["checking", "savings", "emergency_fund", "other"]).optional(),
    balance: z.number().min(0).max(1_000_000_000).optional()
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update." });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`cash-accounts:update:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update." }, { status: 400 });
  }

  try {
    await updateCashAccount(id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("cashAccounts.update", error);
    return NextResponse.json({ error: "Failed to update cash account." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteCashAccount(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("cashAccounts.delete", error);
    return NextResponse.json({ error: "Failed to delete cash account." }, { status: 500 });
  }
}
