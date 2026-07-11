import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  SYSTEM_PROMPT,
  companyAnalysisPrompt,
  documentAnalysisPrompt,
  realEstateAnalysisPrompt,
  wealthAnalysisPrompt
} from "@/lib/prompts";
import { getUser } from "@/lib/supabase/server";
import { getPlan } from "@/lib/profile";
import { PLAN_LIMITS } from "@/lib/limits";
import { countAnalyzeUsageSince, recordAnalyzeUsage, startOfCurrentMonthIso } from "@/lib/usage";
import { logError, logWarn } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const MAX_DOCUMENT_CHARS = 60_000; // matches the slice in lib/prompts.ts documentAnalysisPrompt
const MAX_STRUCTURED_PAYLOAD_CHARS = 20_000;

const bodySchema = z
  .object({
    mode: z.enum(["company", "document", "real_estate", "wealth"]),
    payload: z.unknown()
  })
  .superRefine((data, ctx) => {
    const size = JSON.stringify(data.payload ?? "").length;
    const max = data.mode === "document" ? MAX_DOCUMENT_CHARS : MAX_STRUCTURED_PAYLOAD_CHARS;
    if (size > max) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Payload is too large." });
    }
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

    const plan = await getPlan();
    const usedThisMonth = await countAnalyzeUsageSince(startOfCurrentMonthIso());
    if (usedThisMonth >= PLAN_LIMITS[plan].reportsPerMonth) {
      return NextResponse.json(
        { error: `You've reached your ${plan} plan's monthly report limit. Upgrade for more.` },
        { status: 402 }
      );
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const prompt = (() => {
      switch (parsed.data.mode) {
        case "company":
          return companyAnalysisPrompt(parsed.data.payload);
        case "real_estate":
          return realEstateAnalysisPrompt(parsed.data.payload);
        case "wealth":
          return wealthAnalysisPrompt(parsed.data.payload);
        case "document":
          return documentAnalysisPrompt(String(parsed.data.payload ?? ""));
      }
    })();

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const message = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
      max_tokens: 5000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }]
    });

    const report = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    try {
      await recordAnalyzeUsage(user.id);
    } catch (usageError) {
      logWarn("analyze.recordUsage", usageError);
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
