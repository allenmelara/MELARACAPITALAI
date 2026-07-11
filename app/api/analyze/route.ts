import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  SYSTEM_PROMPT,
  companyAnalysisPrompt,
  documentAnalysisPrompt,
  realEstateAnalysisPrompt,
  wealthAnalysisPrompt,
  INVESTMENT_REPORT_TOOL
} from "@/lib/prompts";
import { getUser } from "@/lib/supabase/server";
import { getPlan } from "@/lib/profile";
import { PLAN_LIMITS, documentCharLimit } from "@/lib/limits";
import { countUsageSince, recordUsage, startOfCurrentMonthIso } from "@/lib/usage";
import { logError, logWarn } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const MAX_STRUCTURED_PAYLOAD_CHARS = 20_000;

const bodySchema = z.object({
  mode: z.enum(["company", "document", "real_estate", "wealth"]),
  payload: z.unknown()
});

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!checkRateLimit(`analyze:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }
    const { mode, payload } = parsed.data;

    const plan = await getPlan();

    // Only the expensive, AI-heavy modes are metered. Real estate and wealth
    // calculators stay unrestricted on every plan, matching the rest of the
    // app's calculators/saved-reports/navigation.
    if (mode === "company") {
      const used = await countUsageSince("analyze", startOfCurrentMonthIso());
      if (used >= PLAN_LIMITS[plan].aiResearchCredits) {
        return NextResponse.json(
          { error: `You've used all your ${plan} plan's AI Research Credits this month. Upgrade for more.` },
          { status: 402 }
        );
      }
      const size = JSON.stringify(payload ?? "").length;
      if (size > MAX_STRUCTURED_PAYLOAD_CHARS) {
        return NextResponse.json({ error: "Payload is too large." }, { status: 400 });
      }
    } else if (mode === "document") {
      const used = await countUsageSince("document", startOfCurrentMonthIso());
      if (used >= PLAN_LIMITS[plan].documentUploadsPerMonth) {
        return NextResponse.json(
          { error: `You've used all your ${plan} plan's document uploads this month. Upgrade for more.` },
          { status: 402 }
        );
      }
      const maxChars = documentCharLimit(plan);
      if (maxChars !== Infinity && String(payload ?? "").length > maxChars) {
        return NextResponse.json(
          {
            error: `Document exceeds your ${plan} plan's ~${PLAN_LIMITS[plan].documentMaxPages}-page limit. Upgrade for a higher limit.`
          },
          { status: 400 }
        );
      }
    } else {
      const size = JSON.stringify(payload ?? "").length;
      if (size > MAX_STRUCTURED_PAYLOAD_CHARS) {
        return NextResponse.json({ error: "Payload is too large." }, { status: 400 });
      }
    }

    const prompt = (() => {
      switch (mode) {
        case "company":
          return companyAnalysisPrompt(payload);
        case "real_estate":
          return realEstateAnalysisPrompt(payload);
        case "wealth":
          return wealthAnalysisPrompt(payload);
        case "document":
          return documentAnalysisPrompt(String(payload ?? ""), documentCharLimit(plan));
      }
    })();

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const isCompanyMode = mode === "company";

    const message = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
      max_tokens: 5000,
      // This produces a fixed structured report (or a single analysis pass),
      // not a task needing extended reasoning — disable thinking so the
      // whole token budget goes to the visible output. Adaptive thinking is
      // on by default on this model and can otherwise consume the entire
      // max_tokens budget on thinking alone.
      thinking: { type: "disabled" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      ...(isCompanyMode
        ? {
            tools: [INVESTMENT_REPORT_TOOL],
            tool_choice: { type: "tool" as const, name: INVESTMENT_REPORT_TOOL.name }
          }
        : {})
    });

    const report = isCompanyMode
      ? JSON.stringify(
          message.content.find((block) => block.type === "tool_use")?.input ?? {}
        )
      : message.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("\n");

    // Real estate and wealth calculators are never metered — only record
    // usage for the two AI-heavy modes that actually consume plan limits.
    if (mode === "company" || mode === "document") {
      try {
        await recordUsage(user.id, mode === "company" ? "analyze" : "document");
      } catch (usageError) {
        logWarn("analyze.recordUsage", usageError);
      }
    }

    return NextResponse.json({ report });
  } catch (error) {
    logError("analyze", error);
    return NextResponse.json(
      { error: "Analysis failed. Check the server logs and API configuration." },
      { status: 500 }
    );
  }
}
