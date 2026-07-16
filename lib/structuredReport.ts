import type { StructuredCompanyReport, StructuredDocumentExtraction } from "@/lib/prompts";

export function parseStructuredCompanyReport(output: string): StructuredCompanyReport | null {
  try {
    const parsed = JSON.parse(output);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.executiveSummary === "string" &&
      typeof parsed.investmentThesis === "string" &&
      Array.isArray(parsed.strengths) &&
      Array.isArray(parsed.risks)
    ) {
      return parsed as StructuredCompanyReport;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseStructuredDocumentExtraction(output: string): StructuredDocumentExtraction | null {
  try {
    const parsed = JSON.parse(output);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
      return parsed as StructuredDocumentExtraction;
    }
    return null;
  } catch {
    return null;
  }
}
