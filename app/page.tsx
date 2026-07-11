"use client";

import { useState } from "react";
import CompanyAnalyzer from "@/components/CompanyAnalyzer";
import DocumentAnalyzer from "@/components/DocumentAnalyzer";

type Module = "company" | "document";

export default function Home() {
  const [module, setModule] = useState<Module>("company");

  return (
    <div className="shell">
      <nav className="nav">
        <div className="brand">Melara Capital <span>AI</span></div>
        <div className="nav-note">Finance intelligence workspace</div>
      </nav>

      <main className="main">
        <section className="hero">
          <div>
            <div className="badge">AI-powered finance analysis</div>
            <h1>Turn financial data into decisions.</h1>
            <p>
              Analyze companies, test valuation assumptions, and transform raw
              financial information into structured research reports.
            </p>
          </div>
          <div className="hero-card">
            <h3>MVP capabilities</h3>
            <ul>
              <li>Company valuation calculator</li>
              <li>Claude-generated research report</li>
              <li>Financial document analysis</li>
              <li>Modular architecture for new tools</li>
            </ul>
          </div>
        </section>

        <section className="grid">
          <aside className="sidebar">
            <button className={`module ${module === "company" ? "active" : ""}`} onClick={() => setModule("company")}>
              Company Analyzer
              <small>DCF, multiples, margins, and AI interpretation</small>
            </button>
            <button className={`module ${module === "document" ? "active" : ""}`} onClick={() => setModule("document")}>
              Document Analyzer
              <small>Analyze pasted statements, CSV exports, and transcripts</small>
            </button>
            <button className="module" disabled>
              Wealth Planner
              <small>Next module: budgets, net worth, and goal projections</small>
            </button>
            <button className="module" disabled>
              Real Estate Lab
              <small>Next module: NOI, cap rate, DSCR, and cash-on-cash return</small>
            </button>
          </aside>

          {module === "company" ? <CompanyAnalyzer /> : <DocumentAnalyzer />}
        </section>
      </main>
    </div>
  );
}
