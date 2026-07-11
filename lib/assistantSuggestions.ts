export type AssistantContext =
  | "landing"
  | "pricing"
  | "dashboard:company"
  | "dashboard:document"
  | "dashboard:real_estate"
  | "dashboard:wealth"
  | "dashboard:reports"
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
  "dashboard:reports": [
    "How do I export a report as a PDF?",
    "Can I chat about a specific report?",
    "How do I rename or delete a report?"
  ],
  general: [
    "What can Melara Capital AI do?",
    "What modules are available?",
    "How does autofill from SEC filings work?"
  ]
};

export type ReportChatModule = "company" | "document" | "real_estate" | "wealth";

// Shown in a saved report's "Ask about this report" chat before the first
// message — tailored to what someone analyzing that kind of report would
// actually want to dig into.
export const REPORT_CHAT_SUGGESTIONS: Record<ReportChatModule, string[]> = {
  company: [
    "What are the biggest risks in this analysis?",
    "How was the DCF implied price calculated?",
    "What would need to be true for the bull case to play out?",
    "How does this compare to the comparable companies?"
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

export function contextFromPath(pathname: string, module: string | null): AssistantContext {
  if (pathname === "/") return "landing";
  if (pathname.startsWith("/pricing")) return "pricing";
  if (pathname.startsWith("/dashboard/reports")) return "dashboard:reports";
  if (pathname.startsWith("/dashboard")) {
    if (module === "document") return "dashboard:document";
    if (module === "real_estate") return "dashboard:real_estate";
    if (module === "wealth") return "dashboard:wealth";
    return "dashboard:company";
  }
  return "general";
}
