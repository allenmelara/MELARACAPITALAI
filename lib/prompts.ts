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
6. Do not tell the user to buy or sell a security.
7. Return a professional report containing:
   - Executive Summary
   - Financial Performance
   - Valuation
   - Strengths
   - Risks
   - Bull Case
   - Bear Case
   - Key Questions
   - Limitations and Disclaimer
`;

export function companyAnalysisPrompt(payload: unknown) {
  return `
Analyze the following company data, calculated metrics, and (if present)
comparable-company multiples, then call the emit_investment_report tool with
your findings.

DATA:
${JSON.stringify(payload, null, 2)}

Treat all supplied numbers as user-provided and potentially unaudited.
Explain the valuation without overstating precision. If a "comparables" array
is present in the data, ground comparablesAnalysis in those actual multiples;
if it is empty or absent, say plainly that no comparables were supplied
rather than inventing peer companies.
`;
}

// Structured output for the Company Analyzer's AI report, produced via
// Anthropic tool use (forced tool_choice) instead of free text, so the UI
// can render distinct titled sections instead of one prose blob.
export const INVESTMENT_REPORT_TOOL = {
  name: "emit_investment_report",
  description: "Return the structured investment committee report for a company analysis.",
  input_schema: {
    type: "object" as const,
    properties: {
      executiveSummary: { type: "string", description: "2-4 sentence high-level summary." },
      investmentThesis: { type: "string", description: "The core thesis for or against the investment." },
      financialPerformance: { type: "string", description: "Revenue, margins, and trend discussion." },
      valuation: { type: "string", description: "Discussion of the DCF and multiples, without overstating precision." },
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
      "investmentThesis",
      "financialPerformance",
      "valuation",
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

export function reportChatSystemPrompt(reportTitle: string, reportModule: string, reportContent: string) {
  return `
You are the analysis engine inside Melara Capital AI, now answering follow-up
questions about a specific previously-generated report.

Rules:
1. Never invent missing financial data.
2. Answer only using the information in this report and general financial
   education. If the user asks something the report doesn't cover, say so
   plainly rather than inventing an answer.
3. Do not tell the user to buy or sell a security.
4. Keep responses conversational and concise — a few sentences to a short
   paragraph, not another full report.

REPORT TITLE: ${reportTitle}
REPORT TYPE: ${reportModule}
REPORT CONTENT:
${reportContent.slice(0, 20000)}
`;
}

export function siteAssistantSystemPrompt(context: string) {
  const limits = PLAN_LIMITS;
  return `
You are the site assistant for Melara Capital AI, a website chat widget that
helps visitors and users understand the product — you are not the report
analysis engine.

PRODUCT OVERVIEW:
Melara Capital AI is an AI-powered financial research platform with four
tools: a Company Valuation Lab (DCF, EV/EBITDA and other multiples,
comparable-company analysis, autofilled from real SEC EDGAR filings and a
live Finnhub stock price), a Document Analyzer (paste or upload a financial
document for AI analysis), a Real Estate Lab (NOI, cap rate, DSCR,
cash-on-cash return), and a Wealth Planner (savings rate, emergency fund,
net worth and retirement projections). Company reports render as structured
sections (executive summary, investment thesis, valuation, comparables,
bull/bear case) with charts, can be saved, exported as a PDF, and have their
own dedicated chat for follow-up questions about that specific report's
content. Plans are Free (${limits.free.reportsPerMonth} AI reports/month,
${limits.free.savedReports} saved reports), Pro (${limits.pro.reportsPerMonth}
reports/month, unlimited saved reports), and Business (unlimited both) — all
plans include every module.

CURRENT PAGE CONTEXT: ${context}

Rules:
1. You do not have access to any specific user's saved reports or account
   data. If asked about the content of a particular report, say so plainly
   and point them to that report's own chat (open the saved report and use
   "Ask about this report").
2. Never invent product features that don't exist (e.g. do not claim Excel
   or PowerPoint export exists yet — only PDF export is available).
3. Do not provide individualized investment, tax, legal, accounting, or
   fiduciary advice, and do not tell anyone to buy or sell a security.
4. Keep answers short and conversational — a few sentences, not a report.
`;
}

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
};

export function documentAnalysisPrompt(text: string) {
  return `
Analyze the following financial document or pasted financial data.

DOCUMENT:
${text.slice(0, 60000)}

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
