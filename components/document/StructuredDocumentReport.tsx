import ConfidenceBadge from "@/components/document/ConfidenceBadge";
import type { StructuredDocumentExtraction, ExtractedDocumentItem } from "@/lib/prompts";
import { money } from "@/lib/finance";

const CATEGORY_LABELS: Record<ExtractedDocumentItem["category"], string> = {
  cash_account: "Cash account",
  debt: "Debt",
  bill: "Bill",
  holding: "Holding"
};

function itemSummary(item: ExtractedDocumentItem): string {
  if (item.category === "holding") {
    const parts = [item.symbol ?? "Unknown symbol"];
    if (item.shares !== undefined) parts.push(`${item.shares} shares`);
    if (item.costBasis !== undefined) parts.push(`${money(item.costBasis)}/share cost basis`);
    return parts.join(" — ");
  }
  const parts = [item.name ?? "Untitled"];
  if (item.amount !== undefined) parts.push(money(item.amount));
  return parts.join(" — ");
}

// Read-only view of a saved Document Analysis extraction — unlike the live
// review flow (components/DocumentAnalyzer.tsx), a past saved report is
// historical record only, no import actions here.
export default function StructuredDocumentReport({ data }: { data: StructuredDocumentExtraction }) {
  if (data.items.length === 0) {
    return <p className="disclaimer">No line items were extracted from this document.</p>;
  }
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {data.items.map((item, index) => (
        <li key={index} className="import-review-row">
          <div className="import-review-header">
            <strong>{CATEGORY_LABELS[item.category]}</strong>
            <ConfidenceBadge confidence={item.confidence} />
          </div>
          <p style={{ margin: 0 }}>{itemSummary(item)}</p>
          <p className="disclaimer import-review-evidence">&quot;{item.evidence}&quot;</p>
        </li>
      ))}
    </ul>
  );
}
