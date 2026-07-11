import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { getReport } from "@/lib/reports";
import { listChatMessages, createChatMessage } from "@/lib/reportChat";
import { reportChatSystemPrompt } from "@/lib/prompts";
import { getPlan } from "@/lib/profile";
import { PLAN_LIMITS } from "@/lib/limits";
import { countUsageSince, recordUsage, startOfCurrentMonthIso } from "@/lib/usage";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const MAX_HISTORY_MESSAGES = 20;

const bodySchema = z.object({
  message: z.string().trim().min(1, "Message is required.").max(2000)
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const messages = await listChatMessages(id);
    return NextResponse.json({ messages });
  } catch (error) {
    logError("reportChat.list", error);
    return NextResponse.json({ error: "Failed to load chat history." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!checkRateLimit(`report-chat:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  }

  const { id } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message." }, { status: 400 });
  }

  try {
    const plan = await getPlan();
    const usedThisMonth = await countUsageSince("chat", startOfCurrentMonthIso());
    if (usedThisMonth >= PLAN_LIMITS[plan].chatMessagesPerMonth) {
      return NextResponse.json(
        { error: `You've reached your ${plan} plan's monthly chat message limit. Upgrade for more.` },
        { status: 402 }
      );
    }

    const report = await getReport(id);
    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const history = await listChatMessages(id);
    const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const reply = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
      max_tokens: 1000,
      system: reportChatSystemPrompt({
        reportTitle: report.title,
        reportModule: report.module,
        reportContent: report.output,
        context: report.input
      }),
      messages: [
        ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: parsed.data.message }
      ]
    });

    const replyText = reply.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const userMessage = await createChatMessage({
      reportId: id,
      userId: user.id,
      role: "user",
      content: parsed.data.message
    });
    const assistantMessage = await createChatMessage({
      reportId: id,
      userId: user.id,
      role: "assistant",
      content: replyText
    });

    await recordUsage(user.id, "chat");

    return NextResponse.json({ userMessage, assistantMessage });
  } catch (error) {
    logError("reportChat.post", error);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
