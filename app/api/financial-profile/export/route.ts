import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getFinancialProfile } from "@/lib/financialProfile";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`financial-profile:export:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  try {
    const profile = await getFinancialProfile();
    const body = JSON.stringify({ exportedAt: new Date().toISOString(), financialProfile: profile }, null, 2);

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="melara-financial-profile.json"'
      }
    });
  } catch (error) {
    logError("financialProfile.export", error);
    return NextResponse.json({ error: "Failed to export your data." }, { status: 500 });
  }
}
