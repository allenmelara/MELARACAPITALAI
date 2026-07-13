import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { listBills, addBill } from "@/lib/bills";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const MAX_BILLS = 40;

const createSchema = z.object({
  name: z.string().trim().min(1, "Enter a bill name.").max(80),
  amount: z.number().min(0).max(1_000_000),
  dueDay: z.number().int().min(1).max(31),
  category: z.string().trim().max(40).optional(),
  autopay: z.boolean().optional()
});

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const bills = await listBills();
    return NextResponse.json({ bills });
  } catch (error) {
    logError("bills.list", error);
    return NextResponse.json({ error: "Failed to load bills." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`bills:create:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid bill." }, { status: 400 });
  }

  try {
    const existing = await listBills();
    if (existing.length >= MAX_BILLS) {
      return NextResponse.json({ error: `You can track up to ${MAX_BILLS} bills.` }, { status: 402 });
    }

    const bill = await addBill(user.id, parsed.data);
    return NextResponse.json({ bill }, { status: 201 });
  } catch (error) {
    logError("bills.create", error);
    return NextResponse.json({ error: "Failed to add bill." }, { status: 500 });
  }
}
