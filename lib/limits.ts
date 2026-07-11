import type { Plan } from "@/lib/profile";

export type PlanLimits = {
  // AI Research Credits: the primary metered resource. Consumed by company
  // investment-report generation (the expensive, forced-tool-use Anthropic
  // call). Real estate and wealth calculators are never metered against this
  // — they stay unrestricted on every plan.
  aiResearchCredits: number;
  savedReports: number;
  chatMessagesPerMonth: number;
  documentUploadsPerMonth: number;
  documentMaxPages: number;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    aiResearchCredits: 5,
    savedReports: Infinity,
    chatMessagesPerMonth: 50,
    documentUploadsPerMonth: 3,
    documentMaxPages: 25
  },
  pro: {
    aiResearchCredits: 100,
    savedReports: Infinity,
    chatMessagesPerMonth: Infinity,
    documentUploadsPerMonth: Infinity,
    documentMaxPages: 500
  },
  business: {
    aiResearchCredits: Infinity,
    savedReports: Infinity,
    chatMessagesPerMonth: Infinity,
    documentUploadsPerMonth: Infinity,
    documentMaxPages: Infinity
  }
};

// There's no PDF/page-parsing pipeline yet — the document analyzer works on
// plain text. This heuristic (a commonly used estimate for a typical
// financial-document page) lets the stated page caps mean something concrete
// today without needing real page extraction.
export const CHARS_PER_PAGE = 1800;

export function documentCharLimit(plan: Plan): number {
  const pages = PLAN_LIMITS[plan].documentMaxPages;
  return pages === Infinity ? Infinity : pages * CHARS_PER_PAGE;
}
