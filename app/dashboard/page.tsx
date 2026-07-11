"use client";

import { useState } from "react";
import CompanyAnalyzer from "@/components/CompanyAnalyzer";
import DocumentAnalyzer from "@/components/DocumentAnalyzer";
import RealEstateAnalyzer from "@/components/RealEstateAnalyzer";
import WealthPlanner from "@/components/WealthPlanner";

type ModuleKey = "company" | "document" | "real_estate" | "wealth";

export default function DashboardPage() {
  const [module, setModule] = useState<ModuleKey>("company");

  return (
    <>
      <section className="dash-header">
        <h1>Workspace</h1>
        <p>Analyze companies, real estate, and personal finances with Claude-generated reports.</p>
      </section>

      <section className="grid">
        <aside className="sidebar">
          <button
            className={`module ${module === "company" ? "active" : ""}`}
            onClick={() => setModule("company")}
          >
            Company Analyzer
            <small>DCF, multiples, margins, and AI interpretation</small>
          </button>
          <button
            className={`module ${module === "document" ? "active" : ""}`}
            onClick={() => setModule("document")}
          >
            Document Analyzer
            <small>Analyze pasted statements, CSV exports, and transcripts</small>
          </button>
          <button
            className={`module ${module === "real_estate" ? "active" : ""}`}
            onClick={() => setModule("real_estate")}
          >
            Real Estate Lab
            <small>NOI, cap rate, DSCR, and cash-on-cash return</small>
          </button>
          <button
            className={`module ${module === "wealth" ? "active" : ""}`}
            onClick={() => setModule("wealth")}
          >
            Wealth Planner
            <small>Budgets, net worth, and retirement projections</small>
          </button>
        </aside>

        {module === "company" && <CompanyAnalyzer />}
        {module === "document" && <DocumentAnalyzer />}
        {module === "real_estate" && <RealEstateAnalyzer />}
        {module === "wealth" && <WealthPlanner />}
      </section>
    </>
  );
}
