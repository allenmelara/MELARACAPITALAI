"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";

export type SelectedCompany = { ticker: string; name: string };

type Result = { symbol: string; name: string; exchangeType: string };

// Step 1 search: a single box that accepts a company name or a ticker. Names
// resolve through Finnhub's symbol search (debounced); a typed ticker can be
// submitted directly with Enter without waiting for the dropdown.
export default function CompanySearch({
  onSelect,
  autoFocus = true
}: {
  onSelect: (company: SelectedCompany) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/company-search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Search failed");
        setResults(data.results ?? []);
        setActive(0);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Search failed");
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  function choose(result: Result) {
    onSelect({ ticker: result.symbol, name: result.name });
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) {
        choose(results[active]);
      } else if (/^[A-Za-z.\-]{1,10}$/.test(query.trim())) {
        // No dropdown match, but the text looks like a ticker — submit it directly.
        onSelect({ ticker: query.trim().toUpperCase(), name: query.trim().toUpperCase() });
        setQuery("");
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="company-search" ref={boxRef}>
      <div className="company-search-field">
        <Search size={18} className="company-search-icon" />
        <input
          className="company-search-input"
          placeholder="Search a company or enter a ticker (e.g. Apple or AAPL)"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          aria-label="Search for a public company"
        />
        {loading && <Loader2 size={16} className="company-search-spinner" />}
      </div>

      {open && results.length > 0 && (
        <ul className="company-search-results" role="listbox">
          {results.map((r, i) => (
            <li key={r.symbol}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={`company-search-result ${i === active ? "active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r)}
              >
                <span className="company-search-ticker">{r.symbol}</span>
                <span className="company-search-name">{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && query.trim().length >= 2 && results.length === 0 && !error && (
        <div className="company-search-empty">
          No matches. Press Enter to look up &ldquo;{query.trim().toUpperCase()}&rdquo; as a ticker.
        </div>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
