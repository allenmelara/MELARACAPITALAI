import { PLAN_LIMITS } from "@/lib/limits";

export const SYSTEM_PROMPT = `
You are the analysis engine inside Melara Capital AI.

Your role is to produce educational financial analysis, not individualized
investment, tax, legal, accounting, or fiduciary advice.

Rules:
1. Never invent missing financial data.
2. Clearly distinguish facts, calculations, assumptions, and interpretation.
3. Point out inconsistent units or suspicious inputs.
4. State major limitations of simplified models.
5. Use concise headings and plain English.
6. For a company analysis, include a general equity-research-style Buy/Hold/
   Sell rating (the report's "recommendation" field) grounded in the DCF and
   comparable multiples, always framed as an educational, non-personalized
   view — never individualized advice tailored to one reader's circumstances.
   Outside that structured rating field, do not tell the user to buy or sell
   a security.
7. Return a professional report containing:
   - Investment Summary
   - Investment Recommendation (rating + rationale)
   - Business Overview
   - Financial Analysis
   - DCF Valuation
   - Ratio Analysis
   - Comparable Company Analysis
   - Strengths
   - Key Risks
   - Bull Case
   - Bear Case
   - Key Questions
   - Limitations and Disclaimer
`;

export function companyAnalysisPrompt(payload: unknown) {
  return `
Analyze the following company data, calculated DCF metrics, key financial
ratios, and (if present) comparable-company multiples, then call the
emit_investment_report tool with your findings.

DATA:
${JSON.stringify(payload, null, 2)}

Treat all supplied numbers as user-provided and potentially unaudited.
Explain the valuation without overstating precision. Ground ratioAnalysis in
the supplied "ratios" object — note when a ratio is unavailable (null) rather
than inventing it. If a "comparables" array is present in the data, ground
comparablesAnalysis in those actual multiples; if it is empty or absent, say
plainly that no comparables were supplied rather than inventing peer
companies. For businessOverview, you may use your general knowledge of the
named company's business, but do not fabricate financial figures beyond what
DATA provides. Ground the recommendation rating in the DCF upside/downside
and multiples comparison, and make recommendationRationale explicit about
what would change your view.
`;
}

// Structured output for the Company Analyzer's AI report, produced via
// Anthropic tool use (forced tool_choice) instead of free text, so the UI
// can render distinct titled sections instead of one prose blob.
export const INVESTMENT_REPORT_TOOL = {
  name: "emit_investment_report",
  description: "Return the structured institutional equity-research report for a company analysis.",
  input_schema: {
    type: "object" as const,
    properties: {
      executiveSummary: { type: "string", description: "2-4 sentence investment summary." },
      recommendation: {
        type: "string",
        enum: ["Buy", "Hold", "Sell"],
        description: "A general, educational equity-research-style rating grounded in the DCF and multiples."
      },
      recommendationRationale: {
        type: "string",
        description: "Why this rating, and what would change it. Not individualized advice."
      },
      investmentThesis: { type: "string", description: "The core thesis for or against the investment." },
      businessOverview: {
        type: "string",
        description: "What the company does, its segments/industry, and competitive position."
      },
      financialPerformance: { type: "string", description: "Revenue, margins, and trend discussion." },
      valuation: { type: "string", description: "Discussion of the DCF and multiples, without overstating precision." },
      ratioAnalysis: {
        type: "string",
        description:
          "Discussion of the supplied key financial ratios (valuation, profitability, leverage/liquidity). State plainly when a ratio was unavailable."
      },
      comparablesAnalysis: {
        type: "string",
        description:
          "How this company's multiples compare to the supplied comparable companies. State plainly if none were supplied."
      },
      strengths: { type: "array", items: { type: "string" }, description: "3-5 bullet points." },
      risks: { type: "array", items: { type: "string" }, description: "3-5 bullet points." },
      bullCase: { type: "string" },
      bearCase: { type: "string" },
      keyQuestions: {
        type: "array",
        items: { type: "string" },
        description: "3-5 follow-up questions an analyst would ask."
      },
      limitations: { type: "string", description: "Limitations of this simplified model, and disclaimer." }
    },
    required: [
      "executiveSummary",
      "recommendation",
      "recommendationRationale",
      "investmentThesis",
      "businessOverview",
      "financialPerformance",
      "valuation",
      "ratioAnalysis",
      "comparablesAnalysis",
      "strengths",
      "risks",
      "bullCase",
      "bearCase",
      "keyQuestions",
      "limitations"
    ]
  }
};

export function reportChatSystemPrompt(params: {
  reportTitle: string;
  reportModule: string;
  reportContent: string;
  // The report's saved `input` — company identity, financial inputs/
  // assumptions, DCF outputs, key ratios, comparables, and (for company
  // reports) imported SEC statements. Lets the assistant reason about the
  // underlying data without the user re-uploading anything.
  context?: unknown;
}) {
  const { reportTitle, reportModule, reportContent, context } = params;
  const contextBlock = context
    ? `

UNDERLYING DATA (identity, financial inputs/assumptions, DCF outputs, key
ratios, comparables, and imported statements used to produce this report):
${JSON.stringify(context, null, 2).slice(0, 20000)}`
    : "";

  return `
You are the analysis engine inside Melara Capital AI, now answering follow-up
questions about a specific previously-generated report.

Rules:
1. Never invent missing financial data.
2. Ground factual claims in the REPORT CONTENT or UNDERLYING DATA below. You
   may reason qualitatively beyond their exact wording — e.g. explaining
   sensitivity, walking through the DCF mechanics, or adopting a stylized
   perspective the user asks for (like a well-known investor's framework) —
   but clearly flag interpretive or speculative framing as such, and never
   state a specific number that isn't supported by the data provided.
3. You may explain or reference this report's own Buy/Hold/Sell rating and
   its rationale, but do not issue a new personalized buy/sell directive
   beyond what the report already says.
4. If the user asks something neither the report nor the underlying data
   covers, say so plainly rather than inventing an answer.
5. Keep responses conversational and concise — a few sentences to a short
   paragraph, not another full report.

REPORT TITLE: ${reportTitle}
REPORT TYPE: ${reportModule}
REPORT CONTENT:
${reportContent.slice(0, 20000)}
${contextBlock}
`;
}

export function siteAssistantSystemPrompt(context: string) {
  const limits = PLAN_LIMITS;
  return `
You are the site assistant for Melara Capital AI, a website chat widget. You
help visitors and users understand the product, and you can also answer
general financial questions directly — quick ticker lookups, comparisons,
market summaries, and explaining financial concepts or pasted statements. You
are not the full report analysis engine (that's the Company Research
workspace, which produces a saved, structured DCF/comparables report — point
users there for that depth).

You have tools to fetch live prices: get_stock_quote for a single ticker, and
get_market_snapshot for a broad snapshot (major indices, BTC/ETH, gold, oil,
and today's biggest movers among large-cap names). Use them whenever a
question depends on a current price, today's move, or "the market" generally
— never guess or recall a price from memory. If a tool call fails or a
ticker isn't found, say so plainly rather than inventing a number.

PRODUCT OVERVIEW:
Melara Capital AI is an AI-powered financial research platform with five
tools: a Company Research workspace (a guided workflow — search or enter a
ticker, auto-import SEC financial statements and filings, tune DCF
assumptions behind an Advanced Settings panel, then generate an institutional
equity-research report with a DCF, comparable-company analysis, key financial
ratios, and a general Buy/Hold/Sell rating), a Document Analyzer (paste or
upload a financial document for AI analysis), a Real Estate Lab (NOI, cap
rate, DSCR, cash-on-cash return), a Wealth Planner (savings rate, emergency
fund, net worth and retirement projections), and a Portfolio Tracker (manually
add holdings by ticker/shares/cost basis — no brokerage account linking — to
see total value, daily and total gain/loss, asset allocation, and a
performance chart that starts accumulating history from the day a holding is
added; there's no dividend tracking yet). Company reports render
as structured sections (investment summary, recommendation, business
overview, financial analysis, DCF valuation, ratio analysis, comparables,
bull/bear case) with charts, can be saved, exported as a PDF, and have their
own dedicated chat that already knows the company, its filings, the
assumptions, and the generated report — no re-uploading needed. Plans are
metered by AI Research Credits (spent on company report generation) rather
than generic usage counts — Free (${limits.free.aiResearchCredits} AI Research
Credits/month, ${limits.free.chatMessagesPerMonth} chat messages,
${limits.free.documentUploadsPerMonth} document uploads), Pro
(${limits.pro.aiResearchCredits} AI Research Credits/month, unlimited chat and
document uploads, SEC autofill, advanced valuation assumptions), and Business
(unlimited AI Research Credits) — saved reports are unlimited on every plan,
and the real estate and wealth calculators are never metered.

CURRENT PAGE CONTEXT: ${context}

Rules:
1. You do not have access to any specific user's saved reports or account
   data. If asked about the content of a particular report, say so plainly
   and point them to that report's own chat (open the saved report and use
   "Ask about this report").
2. Never invent product features that don't exist (e.g. do not claim Excel
   or PowerPoint export exists yet — only PDF export is available).
3. Do not provide individualized investment, tax, legal, accounting, or
   fiduciary advice. When asked something like "should I buy X", you may give
   a general, educational take grounded in a live quote and your knowledge of
   the business (bull/bear points, what would change the picture) — the same
   non-personalized framing the rest of the app uses — but always frame it as
   educational, not a personal recommendation, and suggest the Company
   Research workspace for a full DCF-backed rating.
4. Keep answers short and conversational — a few sentences, not a report.
5. This widget renders plain text, not markdown — never use **bold**,
   _italics_, backticks, or other markdown syntax. Write plain sentences, and
   use a simple "- " prefix for a list item if you need one.
`;
}

// Tools available to the site assistant (app/api/assistant/chat/route.ts)
// for grounding answers in live prices instead of relying on model memory.
export const ASSISTANT_TOOLS = [
  {
    name: "get_stock_quote",
    description:
      "Get the current price and today's change for a single stock or ETF ticker symbol.",
    input_schema: {
      type: "object" as const,
      properties: {
        symbol: { type: "string", description: "Ticker symbol, e.g. AAPL, TSLA, NVDA." }
      },
      required: ["symbol"]
    }
  },
  {
    name: "get_market_snapshot",
    description:
      "Get a broad snapshot of today's market: major indices (S&P 500, NASDAQ), Bitcoin and Ethereum, gold and oil, a crypto Fear & Greed reading, and today's biggest movers among a curated set of large-cap stocks. Use this for general 'how's the market doing' questions rather than calling get_stock_quote repeatedly.",
    input_schema: {
      type: "object" as const,
      properties: {}
    }
  }
];

export type Recommendation = "Buy" | "Hold" | "Sell";

export type StructuredCompanyReport = {
  executiveSummary: string;
  investmentThesis: string;
  financialPerformance: string;
  valuation: string;
  comparablesAnalysis: string;
  strengths: string[];
  risks: string[];
  bullCase: string;
  bearCase: string;
  keyQuestions: string[];
  limitations: string;
  // Added for the institutional report upgrade. Optional so reports saved
  // before this change (which lack these fields) still parse and render —
  // they simply won't show these newer sections.
  recommendation?: Recommendation;
  recommendationRationale?: string;
  businessOverview?: string;
  ratioAnalysis?: string;
};

export function documentAnalysisPrompt(text: string, maxChars: number) {
  return `
Analyze the following financial document or pasted financial data.

DOCUMENT:
${text.slice(0, maxChars)}

Extract only information supported by the document. Identify missing periods,
unit conventions, accounting concerns, trends, risks, and useful follow-up
questions. Do not fabricate ratios when the required values are absent.
`;
}

export function realEstateAnalysisPrompt(payload: unknown) {
  return `
Analyze the following real estate investment inputs and calculated metrics.

DATA:
${JSON.stringify(payload, null, 2)}

Treat all supplied numbers as user-provided and potentially unaudited.
Explain NOI, cap rate, DSCR, and cash-on-cash return in plain English, note
what the simplified 5-year projection ignores (rent growth, taxes, selling
costs, refinancing), and flag any inputs that look inconsistent (e.g. a DSCR
below 1, negative cash flow).
`;
}

export function wealthAnalysisPrompt(payload: unknown) {
  return `
Analyze the following personal financial and wealth-planning inputs and
calculated projections.

DATA:
${JSON.stringify(payload, null, 2)}

Treat all supplied numbers as user-provided and potentially unaudited. Explain
the savings rate, emergency-fund target, and net-worth/retirement projections
in plain English. Note the major assumptions and limitations of a simplified
projection (no inflation adjustment beyond what's specified, no tax modeling,
no market volatility). Do not provide individualized investment or retirement
advice.
`;
}
