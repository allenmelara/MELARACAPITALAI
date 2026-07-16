export type AssistantContext =
  | "landing"
  | "pricing"
  | "dashboard:overview"
  | "dashboard:company"
  | "dashboard:document"
  | "dashboard:real_estate"
  | "dashboard:wealth"
  | "dashboard:portfolio"
  | "dashboard:news"
  | "dashboard:learn"
  | "dashboard:reports"
  | "dashboard:settings"
  | "general";

export const SUGGESTED_QUESTIONS: Record<AssistantContext, string[]> = {
  landing: [
    "What can Melara Capital AI do?",
    "How much does it cost?",
    "Is this real investment advice?"
  ],
  pricing: [
    "What's the difference between Free, Pro, and Business?",
    "Can I cancel anytime?",
    "What happens if I hit my monthly report limit?"
  ],
  "dashboard:overview": [
    "How do I get started?",
    "What's the difference between the modules?",
    "Where can I see my past reports?"
  ],
  "dashboard:company": [
    "What is EV/EBITDA?",
    "How does the DCF model work?",
    "What's a reasonable discount rate to use?",
    "How do I add comparable companies?"
  ],
  "dashboard:document": ["What file types can I upload?", "How long can my document be?"],
  "dashboard:real_estate": [
    "What's a good cap rate?",
    "What does DSCR mean?",
    "How is cash-on-cash return calculated?"
  ],
  "dashboard:wealth": ["How big should my emergency fund be?", "What's a healthy savings rate?"],
  "dashboard:portfolio": [
    "How is daily gain/loss calculated?",
    "Can I connect my brokerage account?",
    "How does the performance chart build up?"
  ],
  "dashboard:news": [
    "How is this news personalized to me?",
    "Are the AI summaries accurate?",
    "How are Earnings and Fed & Policy decided?"
  ],
  "dashboard:learn": [
    "What's the difference between a 401(k) and a Roth IRA?",
    "Explain EBITDA in plain English",
    "What's a good savings rate for a beginner?"
  ],
  "dashboard:reports": [
    "How do I export a report as a PDF?",
    "Can I chat about a specific report?",
    "How do I rename or delete a report?"
  ],
  "dashboard:settings": [
    "How do I upgrade my plan?",
    "How do I cancel my subscription?",
    "How do I change my email or password?"
  ],
  general: [
    "What can Melara Capital AI do?",
    "What modules are available?",
    "How does autofill from SEC filings work?"
  ]
};

// Shown to signed-in users in the "Ask Melara AI" widget instead of the
// page-context list — coach questions are relevant on any page, not tied to
// where the user happens to be browsing.
export const COACH_SUGGESTED_QUESTIONS: string[] = [
  "What should I prioritize this month?",
  "Can I afford to invest more?",
  "How long will it take to pay off my debt?",
  "What happens if I save another $200 monthly?",
  "Compare paying debt versus investing.",
  "Am I prepared for an emergency?",
  "Explain my financial health in simple terms."
];

export type ReportChatModule = "company" | "document" | "real_estate" | "wealth";

// Shown in a saved report's "Ask about this report" chat before the first
// message — tailored to what someone analyzing that kind of report would
// actually want to dig into.
export const REPORT_CHAT_SUGGESTIONS: Record<ReportChatModule, string[]> = {
  company: [
    "Explain the valuation.",
    "What are the biggest risks?",
    "What assumptions drive intrinsic value?",
    "How sensitive is the DCF?",
    "What would Berkshire think about this company?"
  ],
  document: [
    "What are the key takeaways from this document?",
    "Are there any red flags or inconsistencies?",
    "What financial trends does this document show?",
    "What questions should I ask before making a decision?"
  ],
  real_estate: [
    "Is this a good deal based on the cap rate?",
    "What are the biggest risks with this property?",
    "How sensitive is this deal to vacancy assumptions?",
    "What would improve the cash-on-cash return?"
  ],
  wealth: [
    "Am I on track for retirement?",
    "How could I improve my savings rate?",
    "What's the biggest risk in this financial plan?",
    "How does inflation affect these projections?"
  ]
};

export function contextFromPath(pathname: string): AssistantContext {
  if (pathname === "/") return "landing";
  if (pathname.startsWith("/pricing")) return "pricing";
  if (pathname.startsWith("/dashboard/reports")) return "dashboard:reports";
  if (pathname.startsWith("/dashboard/settings")) return "dashboard:settings";
  if (pathname.startsWith("/dashboard/company")) return "dashboard:company";
  if (pathname.startsWith("/dashboard/documents")) return "dashboard:document";
  if (pathname.startsWith("/dashboard/real-estate")) return "dashboard:real_estate";
  if (pathname.startsWith("/dashboard/wealth")) return "dashboard:wealth";
  if (pathname.startsWith("/dashboard/portfolio")) return "dashboard:portfolio";
  if (pathname.startsWith("/dashboard/news")) return "dashboard:news";
  if (pathname.startsWith("/dashboard/learn")) return "dashboard:learn";
  if (pathname.startsWith("/dashboard/analytics")) return "dashboard:overview";
  return "general";
}
