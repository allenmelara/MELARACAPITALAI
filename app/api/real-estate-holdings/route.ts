import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { listRealEstateHoldings, addRealEstateHolding } from "@/lib/realEstateHoldings";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const MAX_HOLDINGS = 20;

const createSchema = z.object({
  name: z.string().trim().min(1, "Enter a property name.").max(80),
  estimatedValue: z.number().min(0).max(1_000_000_000),
  mortgageBalance: z.number().min(0).max(1_000_000_000).optional()
});

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const holdings = await listRealEstateHoldings();
    return NextResponse.json({ holdings });
  } catch (error) {
    logError("realEstateHoldings.list", error);
    return NextResponse.json({ error: "Failed to load real estate holdings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`real-estate-holdings:create:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid property." }, { status: 400 });
  }

  try {
    const existing = await listRealEstateHoldings();
    if (existing.length >= MAX_HOLDINGS) {
      return NextResponse.json({ error: `You can track up to ${MAX_HOLDINGS} properties.` }, { status: 402 });
    }

    const holding = await addRealEstateHolding(user.id, parsed.data);
    return NextResponse.json({ holding }, { status: 201 });
  } catch (error) {
    logError("realEstateHoldings.create", error);
    return NextResponse.json({ error: "Failed to add property." }, { status: 500 });
  }
}
