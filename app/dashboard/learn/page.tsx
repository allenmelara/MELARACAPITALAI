import Link from "next/link";
import { BookOpen, TrendingUp, FileText, Landmark, PiggyBank } from "lucide-react";
import { LEARN_GUIDES } from "@/lib/education";

const GUIDE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  "investing-basics": TrendingUp,
  "financial-statements": FileText,
  taxes: Landmark,
  retirement: PiggyBank
};

export default function LearnHubPage() {
  return (
    <>
      <section className="dash-header">
        <h1>Learn</h1>
        <p>Plain-English finance education — a glossary and a few core guides. Educational only, not advice.</p>
      </section>

      <div className="learn-hub-grid">
        <Link href="/dashboard/learn/glossary" className="learn-hub-card">
          <BookOpen size={22} />
          <div>
            <h3>Finance Glossary</h3>
            <p>Searchable definitions for common investing, valuation, and accounting terms.</p>
          </div>
        </Link>
        {LEARN_GUIDES.map((guide) => {
          const Icon = GUIDE_ICONS[guide.slug];
          return (
            <Link key={guide.slug} href={`/dashboard/learn/${guide.slug}`} className="learn-hub-card">
              <Icon size={22} />
              <div>
                <h3>{guide.title}</h3>
                <p>{guide.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
