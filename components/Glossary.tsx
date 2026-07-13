"use client";

import { useMemo, useState } from "react";
import { GLOSSARY, GLOSSARY_CATEGORIES, type GlossaryCategory } from "@/lib/education";

export default function Glossary() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GlossaryCategory | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GLOSSARY.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      if (!q) return true;
      return entry.term.toLowerCase().includes(q) || entry.definition.toLowerCase().includes(q);
    }).sort((a, b) => a.term.localeCompare(b.term));
  }, [query, category]);

  return (
    <div className="panel">
      <h2>Finance Glossary</h2>
      <p className="disclaimer">{GLOSSARY.length} terms — search or filter by category.</p>

      <input
        className="glossary-search"
        placeholder="Search terms..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="news-tabs">
        <button className={`news-tab ${category === "all" ? "active" : ""}`} onClick={() => setCategory("all")}>
          All
        </button>
        {GLOSSARY_CATEGORIES.map((c) => (
          <button key={c} className={`news-tab ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="disclaimer">No terms match &quot;{query}&quot;.</p>
      ) : (
        <dl className="glossary-list">
          {filtered.map((entry) => (
            <div key={entry.term} className="glossary-entry">
              <dt>
                {entry.term}
                <span className="glossary-category">{entry.category}</span>
              </dt>
              <dd>{entry.definition}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
