import type { ExtractedItemConfidence } from "@/lib/prompts";

// Provenance chip for an extracted document line item, visually consistent
// with components/company/SourceBadge.tsx but a distinct component — the
// semantics (how sure was the model, not where did a value come from) don't
// map cleanly onto SourceBadge's FieldSource union.
const CONFIG: Record<ExtractedItemConfidence, { label: string; className: string }> = {
  high: { label: "High confidence", className: "confidence-high" },
  medium: { label: "Medium confidence", className: "confidence-medium" },
  low: { label: "Review carefully", className: "confidence-low" }
};

export default function ConfidenceBadge({ confidence }: { confidence: ExtractedItemConfidence }) {
  const config = CONFIG[confidence];
  return <span className={`source-badge ${config.className}`}>{config.label}</span>;
}
