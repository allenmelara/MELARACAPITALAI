import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/ip";
import { siteAssistantSystemPrompt, ASSISTANT_TOOLS } from "@/lib/prompts";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError, logWarn } from "@/lib/logger";
import { getQuoteChange } from "@/lib/finnhub";
import { getMarketSnapshot } from "@/lib/marketData";
import { getNewsFeed } from "@/lib/news";
import { listCoachMessages, createCoachMessage } from "@/lib/coachChat";
import {
  getFinancialOverview,
  getGoalsForCoach,
  getDebtsForCoach,
  getSpendingHistoryForCoach,
  getPeriodSummary,
  simulateExtraSavingsForCoach,
  simulateDebtPayoffForCoach,
  compareDebtVsInvestingForCoach
} from "@/lib/coachContext";

export const runtime = "nodejs";

const MAX_HISTORY_MESSAGES = 10;
const MAX_TOOL_ROUNDS = 3;
const MAX_HEADLINES_FOR_MODEL = 15;

async function runTool(name: string, input: Record<string, unknown>, userId: string | null): Promise<unknown> {
  if (name === "get_stock_quote") {
    const symbol = String(input.symbol ?? "").toUpperCase();
    if (!symbol) return { error: "No symbol provided." };
    const quote = await getQuoteChange(symbol);
    if (!quote) return { error: `No quote found for ${symbol}.` };
    return { symbol, ...quote };
  }
  if (name === "get_market_snapshot") {
    return getMarketSnapshot();
  }
  if (name === "get_news_headlines") {
    if (!userId) return { error: "Not logged in — the News Feed is only available to signed-in users." };
    const category = typeof input.category === "string" ? input.category : undefined;
    const feed = await getNewsFeed(userId);
    const articles = category ? feed.articles.filter((a) => a.category === category) : feed.articles;
    return {
      generatedAt: feed.generatedAt,
      articles: articles.slice(0, MAX_HEADLINES_FOR_MODEL).map((a) => ({
        headline: a.headline,
        source: a.source,
        category: a.category,
        relatedSymbol: a.relatedSymbol,
        summary: a.aiSummary ?? a.snippet,
        publishedAt: a.publishedAt
      }))
    };
  }

  // Personal-finance coach tools — every one requires a signed-in user since
  // they read the user's own saved data, gated the same way as get_news_headlines.
  if (name === "get_financial_overview") {
    if (!userId) return { error: "Not logged in — personalized coaching requires signing in." };
    return getFinancialOverview(userId);
  }
  if (name === "get_goals") {
    if (!userId) return { error: "Not logged in — personalized coaching requires signing in." };
    return getGoalsForCoach();
  }
  if (name === "get_debts") {
    if (!userId) return { error: "Not logged in — personalized coaching requires signing in." };
    return getDebtsForCoach();
  }
  if (name === "get_spending_history") {
    if (!userId) return { error: "Not logged in — personalized coaching requires signing in." };
    return getSpendingHistoryForCoach();
  }
  if (name === "get_period_summary") {
    if (!userId) return { error: "Not logged in — personalized coaching requires signing in." };
    const period = input.period === "week" ? "week" : "month";
    return getPeriodSummary(userId, period);
  }
  if (name === "simulate_extra_savings") {
    if (!userId) return { error: "Not logged in — personalized coaching requires signing in." };
    const extraMonthlyAmount = Number(input.extraMonthlyAmount) || 0;
    const months = input.months !== undefined ? Number(input.months) || 12 : 12;
    return simulateExtraSavingsForCoach(extraMonthlyAmount, months);
  }
  if (name === "simulate_debt_payoff") {
    if (!userId) return { error: "Not logged in — personalized coaching requires signing in." };
    const extraMonthlyPayment = Number(input.extraMonthlyPayment) || 0;
    return simulateDebtPayoffForCoach(extraMonthlyPayment);
  }
  if (name === "compare_debt_vs_investing") {
    if (!userId) return { error: "Not logged in — personalized coaching requires signing in." };
    const extraMonthlyAmount = Number(input.extraMonthlyAmount) || 0;
    return compareDebtVsInvestingForCoach(extraMonthlyAmount);
  }

  return { error: `Unknown tool ${name}.` };
}

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

// Hydrates the widget's conversation on mount for signed-in users — the
// widget stays fully in-memory/ephemeral for anonymous visitors (no GET
// needed on that path, matching today's behavior).
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ loggedIn: false, messages: [] });
  }
  try {
    const messages = await listCoachMessages();
    return NextResponse.json({ loggedIn: true, messages });
  } catch (error) {
    logError("assistant.chat.history", error);
    return NextResponse.json({ error: "Failed to load conversation history." }, { status: 500 });
  }
}

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

    // Signed-in users: trust persisted history, not whatever the client sent
    // (more robust, and the client no longer needs to manage/replay it).
    // Anonymous visitors: unchanged — client-managed ephemeral history.
    const recentHistory = user
      ? (await listCoachMessages()).slice(-MAX_HISTORY_MESSAGES)
      : parsed.data.history.slice(-MAX_HISTORY_MESSAGES);

    const messages: Anthropic.MessageParam[] = [
      ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: parsed.data.message }
    ];

    let replyText = "";
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const reply = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
        max_tokens: user ? 900 : 500, // signed-in coach answers (summaries, action plans) run longer
        system: siteAssistantSystemPrompt(parsed.data.context, Boolean(user)),
        tools: ASSISTANT_TOOLS,
        messages
      });

      const toolUseBlocks = reply.content.filter((block) => block.type === "tool_use");
      replyText = reply.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      if (reply.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
        break;
      }

      messages.push({ role: "assistant", content: reply.content });
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          let result: unknown;
          try {
            result = await runTool(block.name, block.input as Record<string, unknown>, user?.id ?? null);
          } catch (error) {
            logWarn(`assistant.tool.${block.name}`, error);
            result = { error: "Tool call failed." };
          }
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: JSON.stringify(result)
          };
        })
      );
      messages.push({ role: "user", content: toolResults });
    }

    if (user) {
      try {
        await createCoachMessage({ userId: user.id, role: "user", content: parsed.data.message });
        await createCoachMessage({ userId: user.id, role: "assistant", content: replyText });
      } catch (persistError) {
        logWarn("assistant.chat.persist", persistError);
      }
    }

    return NextResponse.json({ reply: replyText });
  } catch (error) {
    logError("assistant.chat", error);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
