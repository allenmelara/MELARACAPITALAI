import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { listReports, createReport, countAllReports } from "@/lib/reports";
import { getPlan } from "@/lib/profile";
import { PLAN_LIMITS } from "@/lib/limits";
import { logError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  module: z.enum(["company", "document", "wealth", "real_estate"]),
  input: z.unknown(),
  output: z.string().min(1).max(60000)
});

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const reports = await listReports();
    return NextResponse.json({ reports });
  } catch (error) {
    logError("reports.list", error);
    return NextResponse.json({ error: "Failed to load reports." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`reports:create:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid report payload." }, { status: 400 });
  }

  try {
    const plan = await getPlan();
    const savedCount = await countAllReports();
    if (savedCount >= PLAN_LIMITS[plan].savedReports) {
      return NextResponse.json(
        { error: `You've reached your ${plan} plan's saved report limit. Upgrade or delete an old report.` },
        { status: 402 }
      );
    }

    const report = await createReport(user.id, parsed.data);
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    logError("reports.create", error);
    return NextResponse.json({ error: "Failed to save report." }, { status: 500 });
  }
}
