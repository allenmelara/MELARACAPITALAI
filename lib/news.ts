import Anthropic from "@anthropic-ai/sdk";
import { getGeneralNews, getCompanyNews, type NewsItem } from "@/lib/finnhub";
import { listHoldings } from "@/lib/portfolio";
import { getCached, setCached } from "@/lib/ttlCache";
import { logWarn } from "@/lib/logger";
import { NEWS_SUMMARY_TOOL, newsSummaryPrompt } from "@/lib/prompts";

export type NewsCategory = "fed" | "earnings" | "breaking";

export type NewsArticle = {
  id: string;
  headline: string;
  snippet: string;
  source: string;
  url: string;
  image: string | null;
  publishedAt: string;
  category: NewsCategory;
  relatedSymbol: string | null;
  aiSummary: string | null;
};

export type NewsFeed = {
  articles: NewsArticle[];
  generatedAt: string;
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_PORTFOLIO_SYMBOLS = 8;
const MAX_ARTICLES = 40;
const MAX_SUMMARIES = 8;

// Finnhub's news categories are just general/forex/crypto/merger — there's
// no "Fed" or "earnings" category. Approximate those sections by keyword
// match on the headline/snippet instead; anything else falls into "breaking".
const FED_KEYWORDS = [
  "federal reserve",
  "fomc",
  "fed ",
  "interest rate",
  "rate cut",
  "rate hike",
  "powell",
  "monetary policy",
  "central bank"
];
const EARNINGS_KEYWORDS = [
  "earnings",
  "eps",
  "quarterly results",
  "revenue beat",
  "revenue miss",
  "guidance",
  "profit warning",
  "q1 20",
  "q2 20",
  "q3 20",
  "q4 20"
];

function categorize(text: string): NewsCategory {
  const lower = text.toLowerCase();
  if (FED_KEYWORDS.some((k) => lower.includes(k))) return "fed";
  if (EARNINGS_KEYWORDS.some((k) => lower.includes(k))) return "earnings";
  return "breaking";
}

async function getGeneralNewsCached(): Promise<NewsItem[]> {
  const cached = getCached<NewsItem[]>("news:general");
  if (cached) return cached;
  let items: NewsItem[] = [];
  try {
    items = await getGeneralNews();
  } catch (error) {
    logWarn("news.general", error);
  }
  setCached("news:general", items, CACHE_TTL_MS);
  return items;
}

async function getCompanyNewsCached(symbol: string): Promise<NewsItem[]> {
  const key = `news:company:${symbol}`;
  const cached = getCached<NewsItem[]>(key);
  if (cached) return cached;
  let items: NewsItem[] = [];
  try {
    items = await getCompanyNews(symbol);
  } catch (error) {
    logWarn(`news.company.${symbol}`, error);
  }
  setCached(key, items, CACHE_TTL_MS);
  return items;
}

async function summarizeArticles(
  articles: NewsArticle[]
): Promise<Array<{ id: string; summary: string }>> {
  if (!process.env.ANTHROPIC_API_KEY || articles.length === 0) return [];
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
      max_tokens: 1000,
      thinking: { type: "disabled" },
      tools: [NEWS_SUMMARY_TOOL],
      tool_choice: { type: "tool" as const, name: NEWS_SUMMARY_TOOL.name },
      messages: [
        {
          role: "user",
          content: newsSummaryPrompt(
            articles.map((a) => ({ id: a.id, headline: a.headline, source: a.source, snippet: a.snippet }))
          )
        }
      ]
    });
    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return [];
    const input = toolUse.input as { summaries?: Array<{ id: string; summary: string }> };
    return input.summaries ?? [];
  } catch (error) {
    logWarn("news.summarize", error);
    return [];
  }
}

export async function getNewsFeed(userId: string): Promise<NewsFeed> {
  const cacheKey = `news:feed:${userId}`;
  const cached = getCached<NewsFeed>(cacheKey);
  if (cached) return cached;

  const holdings = await listHoldings();
  const symbols = [...new Set(holdings.map((h) => h.symbol))].slice(0, MAX_PORTFOLIO_SYMBOLS);

  const [general, ...companyLists] = await Promise.all([
    getGeneralNewsCached(),
    ...symbols.map((s) => getCompanyNewsCached(s))
  ]);

  const seen = new Set<string>();
  const merged: Array<{ item: NewsItem; relatedSymbol: string | null }> = [];

  for (const item of general.slice(0, 30)) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    merged.push({ item, relatedSymbol: null });
  }

  symbols.forEach((symbol, i) => {
    for (const item of (companyLists[i] ?? []).slice(0, 5)) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      merged.push({ item, relatedSymbol: symbol });
    }
  });

  merged.sort((a, b) => b.item.datetime - a.item.datetime);

  const articles: NewsArticle[] = merged.slice(0, MAX_ARTICLES).map(({ item, relatedSymbol }) => ({
    id: String(item.id),
    headline: item.headline,
    snippet: item.summary,
    source: item.source,
    url: item.url,
    image: item.image,
    publishedAt: new Date(item.datetime * 1000).toISOString(),
    category: categorize(`${item.headline} ${item.summary}`),
    relatedSymbol,
    aiSummary: null
  }));

  const summaries = await summarizeArticles(articles.slice(0, MAX_SUMMARIES));
  const summaryById = new Map(summaries.map((s) => [s.id, s.summary]));
  for (const article of articles) {
    article.aiSummary = summaryById.get(article.id) ?? null;
  }

  const feed: NewsFeed = { articles, generatedAt: new Date().toISOString() };
  setCached(cacheKey, feed, CACHE_TTL_MS);
  return feed;
}
