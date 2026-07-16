// Pure, dependency-free matching logic for Document Analysis import review —
// decides whether an extracted line item corresponds to an existing record
// (cash account / debt / bill by name, holding by symbol) so the review UI
// can default to "update existing" instead of always creating a duplicate.
// Deliberately NOT an LLM decision: none of the target tables have a
// uniqueness constraint on name/symbol, so two or more exact matches are
// reported as ambiguous rather than silently picking one to update.

export type MatchResult<T> = { type: "match"; item: T } | { type: "ambiguous" } | { type: "none" };

export function findExactNameMatch<T extends { name: string }>(
  items: T[],
  candidateName: string | undefined
): MatchResult<T> {
  if (!candidateName) return { type: "none" };
  const normalized = candidateName.trim().toLowerCase();
  const matches = items.filter((i) => i.name.trim().toLowerCase() === normalized);
  if (matches.length === 0) return { type: "none" };
  if (matches.length > 1) return { type: "ambiguous" };
  return { type: "match", item: matches[0] };
}

export function findSymbolMatch<T extends { symbol: string }>(
  items: T[],
  candidateSymbol: string | undefined
): MatchResult<T> {
  if (!candidateSymbol) return { type: "none" };
  const normalized = candidateSymbol.trim().toUpperCase();
  const matches = items.filter((i) => i.symbol.trim().toUpperCase() === normalized);
  if (matches.length === 0) return { type: "none" };
  if (matches.length > 1) return { type: "ambiguous" };
  return { type: "match", item: matches[0] };
}
