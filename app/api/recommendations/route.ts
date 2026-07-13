import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getOrGenerateRecommendations } from "@/lib/recommendations";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`recommendations:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  try {
    const recommendations = await getOrGenerateRecommendations(user.id);
    return NextResponse.json({ recommendations });
  } catch (error) {
    logError("recommendations.get", error);
    return NextResponse.json({ error: "Failed to load recommendations." }, { status: 500 });
  }
}
