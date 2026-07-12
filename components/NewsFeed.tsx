"use client";

import { useMemo, useState } from "react";
import type { NewsArticle, NewsCategory, NewsFeed as NewsFeedData } from "@/lib/news";

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  breaking: "Breaking Market News",
  earnings: "Earnings",
  fed: "Fed & Policy"
};

const TABS: Array<{ key: "all" | NewsCategory; label: string }> = [
  { key: "all", label: "All" },
  { key: "breaking", label: "Breaking Market News" },
  { key: "earnings", label: "Earnings" },
  { key: "fed", label: "Fed & Policy" }
];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ArticleCard({ article }: { article: NewsArticle }) {
  return (
    <a className="news-card" href={article.url} target="_blank" rel="noopener noreferrer">
      <div className="news-card-meta">
        <span className="news-card-source">{article.source}</span>
        <span className="news-card-dot">·</span>
        <span>{timeAgo(article.publishedAt)}</span>
        {article.relatedSymbol && <span className="news-card-tag">{article.relatedSymbol}</span>}
        <span className={`news-card-category news-category-${article.category}`}>
          {CATEGORY_LABELS[article.category]}
        </span>
      </div>
      <h3>{article.headline}</h3>
      {article.aiSummary ? (
        <p className="news-card-summary">
          <span className="news-card-badge">30-second read</span> {article.aiSummary}
        </p>
      ) : article.snippet ? (
        <p className="news-card-summary">{article.snippet}</p>
      ) : null}
    </a>
  );
}

export default function NewsFeed({ initialFeed }: { initialFeed: NewsFeedData }) {
  const [feed, setFeed] = useState(initialFeed);
  const [tab, setTab] = useState<"all" | NewsCategory>("all");
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(
    () => (tab === "all" ? feed.articles : feed.articles.filter((a) => a.category === tab)),
    [feed, tab]
  );

  async function refresh() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/news");
      const data = await response.json();
      if (response.ok) setFeed(data.feed);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="panel">
      <div className="news-header">
        <div>
          <h2>News Feed</h2>
          <p className="disclaimer">
            Personalized to your Portfolio Tracker holdings, plus general market news. Fed/Earnings sections are
            approximated by keyword matching, not a guaranteed category. Not investment advice.
          </p>
        </div>
        <button className="secondary" onClick={refresh} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="news-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`news-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="disclaimer">No stories in this category right now.</p>
      ) : (
        <div className="news-list">
          {filtered.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
