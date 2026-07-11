import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/ip";
import { siteAssistantSystemPrompt } from "@/lib/prompts";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const MAX_HISTORY_MESSAGES = 10;

const bodySchema = z.object({
  message: z.string().trim().min(1, "Message is required.").max(1000),
  context: z.string().max(50),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000)
      })
    )
    .max(20)
    .optional()
    .default([])
});

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  const user = await getUser();
  const rateLimitKey = user ? `assistant:${user.id}` : `assistant:${await getClientIp()}`;

  // Unmetered against plan limits (unlike /api/analyze and the per-report
  // chat) — this rate limit is purely an abuse guard on an otherwise open
  // Claude API cost surface, since the widget works for logged-out visitors.
  if (!checkRateLimit(rateLimitKey, 15, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many messages. Try again in a bit." },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message." }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const recentHistory = parsed.data.history.slice(-MAX_HISTORY_MESSAGES);

    const reply = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
      max_tokens: 500,
      system: siteAssistantSystemPrompt(parsed.data.context),
      messages: [
        ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: parsed.data.message }
      ]
    });

    const replyText = reply.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({ reply: replyText });
  } catch (error) {
    logError("assistant.chat", error);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
