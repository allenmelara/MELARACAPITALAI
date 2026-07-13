import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import {
  financialProfileInputSchema,
  getFinancialProfile,
  upsertFinancialProfile,
  deleteFinancialProfile
} from "@/lib/financialProfile";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const profile = await getFinancialProfile();
    return NextResponse.json({ profile });
  } catch (error) {
    logError("financialProfile.get", error);
    return NextResponse.json({ error: "Failed to load your financial profile." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`financial-profile:save:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const parsed = financialProfileInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid profile." }, { status: 400 });
  }

  try {
    const profile = await upsertFinancialProfile(user.id, parsed.data);
    return NextResponse.json({ profile });
  } catch (error) {
    logError("financialProfile.save", error);
    return NextResponse.json({ error: "Failed to save your financial profile." }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`financial-profile:delete:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  try {
    await deleteFinancialProfile(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("financialProfile.delete", error);
    return NextResponse.json({ error: "Failed to delete your financial profile." }, { status: 500 });
  }
}
