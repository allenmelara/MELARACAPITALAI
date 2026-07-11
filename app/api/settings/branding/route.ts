import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { getPlan } from "@/lib/profile";
import { createServiceClient } from "@/lib/supabase/service";
import { logError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const bodySchema = z.object({
  brandName: z.string().trim().max(120).nullable(),
  brandLogoUrl: z.union([z.string().trim().url().max(2000), z.literal(""), z.null()])
});

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`settings:branding:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  // White-label branding is a Business-plan feature.
  const plan = await getPlan();
  if (plan !== "business") {
    return NextResponse.json({ error: "White-label branding is a Business plan feature." }, { status: 402 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid branding." }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        brand_name: parsed.data.brandName || null,
        brand_logo_url: parsed.data.brandLogoUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("settings.branding", error);
    return NextResponse.json({ error: "Failed to save branding." }, { status: 500 });
  }
}
