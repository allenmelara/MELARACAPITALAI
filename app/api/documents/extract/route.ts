import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { DOCUMENT_EXTRACTION_SYSTEM_PROMPT, DOCUMENT_EXTRACTION_TOOL, documentExtractionPrompt } from "@/lib/prompts";
import type { ExtractedDocumentItem } from "@/lib/prompts";
import { getUser } from "@/lib/supabase/server";
import { getPlan } from "@/lib/profile";
import { PLAN_LIMITS, documentCharLimit } from "@/lib/limits";
import { countUsageSince, recordUsage, startOfCurrentMonthIso } from "@/lib/usage";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError, logWarn } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

// Flat, plan-independent byte cap — Vercel's request body-size ceiling
// (~4.5MB) is infra, not something a paid plan can widen without a much
// bigger async-upload architecture. documentMaxPages/documentCharLimit still
// govern the TXT/CSV/pasted-text sub-path below, where they remain meaningful.
const PDF_MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!checkRateLimit(`documents:extract:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
    }

    const plan = await getPlan();
    const used = await countUsageSince("document", startOfCurrentMonthIso());
    if (used >= PLAN_LIMITS[plan].documentUploadsPerMonth) {
      return NextResponse.json(
        { error: `You've used all your ${plan} plan's document uploads this month. Upgrade for more.` },
        { status: 402 }
      );
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const file = formData.get("file");
    const text = formData.get("text");

    // Anthropic message `content` is either an array of content blocks (PDF
    // — the document travels as its own block) or a plain string (TXT/CSV/
    // pasted text — interpolated directly into the prompt, same as every
    // other mode in this app).
    let content: string | Array<{ type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } } | { type: "text"; text: string }>;

    if (file instanceof File && file.type === "application/pdf") {
      if (file.size > PDF_MAX_BYTES) {
        return NextResponse.json(
          { error: `PDF exceeds the ${Math.round(PDF_MAX_BYTES / (1024 * 1024))}MB limit for statement uploads.` },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      content = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") } },
        { type: "text", text: documentExtractionPrompt() }
      ];
    } else {
      const maxChars = documentCharLimit(plan);
      const rawText = file instanceof File ? await file.text() : typeof text === "string" ? text : "";
      if (!rawText.trim()) {
        return NextResponse.json({ error: "No file or text provided." }, { status: 400 });
      }
      if (maxChars !== Infinity && rawText.length > maxChars) {
        return NextResponse.json(
          {
            error: `Document exceeds your ${plan} plan's ~${PLAN_LIMITS[plan].documentMaxPages}-page limit. Upgrade for a higher limit.`
          },
          { status: 400 }
        );
      }
      content = documentExtractionPrompt(rawText, maxChars);
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
      max_tokens: 8000,
      thinking: { type: "disabled" },
      system: DOCUMENT_EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      tools: [DOCUMENT_EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: DOCUMENT_EXTRACTION_TOOL.name }
    });

    const toolUse = message.content.find((block) => block.type === "tool_use");
    const rawItems = ((toolUse?.input as { items?: ExtractedDocumentItem[] } | undefined)?.items ?? []) as ExtractedDocumentItem[];

    // Defense in depth: never trust the model alone to enforce the
    // low-confidence-for-bills policy the prompt already instructs — a
    // statement's transaction lines are never confirmed recurring
    // obligations, regardless of how confidently Claude reports one.
    const items = rawItems.map((item) => (item.category === "bill" ? { ...item, confidence: "low" as const } : item));

    try {
      await recordUsage(user.id, "document");
    } catch (usageError) {
      logWarn("documents.extract.recordUsage", usageError);
    }

    return NextResponse.json({ items });
  } catch (error) {
    logError("documents.extract", error);
    return NextResponse.json({ error: "Extraction failed. Check the server logs and API configuration." }, { status: 500 });
  }
}
