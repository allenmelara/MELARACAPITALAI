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
Analyze the following company data and calculated metrics.

DATA:
${JSON.stringify(payload, null, 2)}

Treat all supplied numbers as user-provided and potentially unaudited.
Explain the valuation without overstating precision.
`;
}

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
