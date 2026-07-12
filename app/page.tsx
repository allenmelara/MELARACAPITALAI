import Link from "next/link";
import { getMarketSnapshot } from "@/lib/marketData";
import MarketDashboard from "@/components/MarketDashboard";

export const revalidate = 60;

export default async function Home() {
  const marketSnapshot = await getMarketSnapshot();

  return (
    <div className="shell">
      <nav className="nav">
        <div className="brand">
          Melara Capital <span>AI</span>
        </div>
        <div className="nav-actions">
          <Link href="/pricing" className="nav-note">
            Pricing
          </Link>
          <Link href="/login" className="secondary">
            Log in
          </Link>
          <Link href="/signup" className="primary">
            Sign up
          </Link>
        </div>
      </nav>

      <main className="main">
        <section className="hero">
          <div>
            <div className="badge">AI-powered finance analysis</div>
            <h1>Institutional Financial Analysis. Powered by AI.</h1>
            <p>
              Analyze companies, value investments, generate professional
              research reports, and make smarter financial decisions — all in
              one AI-powered workspace.
            </p>
            <div className="actions">
              <Link href="/signup" className="primary">
                Get started free
              </Link>
              <Link href="/pricing" className="secondary">
                See pricing
              </Link>
            </div>
          </div>
          <div className="hero-card">
            <h3>What&apos;s inside</h3>
            <ul>
              <li>Company valuation calculator</li>
              <li>Real estate investment analyzer</li>
              <li>Personal wealth planner</li>
              <li>Claude-generated research reports</li>
              <li>Saved reports, synced to your account</li>
            </ul>
          </div>
        </section>

        <MarketDashboard snapshot={marketSnapshot} />

        <section className="mission">
          <h2>Our Mission</h2>
          <p>
            Professional financial research has traditionally been available
            only to large institutions with access to expensive platforms.
          </p>
          <p>Melara Capital AI is changing that.</p>
          <p>
            We are building an AI-powered research platform that helps anyone
            analyze companies, real estate investments, financial statements,
            and personal wealth with institutional-quality tools and
            AI-generated insights.
          </p>
        </section>

        <section className="why">
          <h2>Why Melara Capital AI?</h2>
          <div className="why-grid">
            <div className="why-card">
              <h3>Institutional Valuation Models</h3>
              <p>DCF, EV/EBITDA, comparable companies, and financial ratio analysis.</p>
            </div>
            <div className="why-card">
              <h3>AI-Powered Insights</h3>
              <p>Transform financial statements into clear, actionable research reports.</p>
            </div>
            <div className="why-card">
              <h3>Professional Research Reports</h3>
              <p>Export polished PDF reports, structured like an analyst&apos;s investment memo.</p>
            </div>
            <div className="why-card">
              <h3>Analyze Multiple Asset Classes</h3>
              <p>Companies, real estate, financial documents, and personal wealth planning.</p>
            </div>
            <div className="why-card">
              <h3>Save Hours of Research</h3>
              <p>Spend less time collecting data and more time making informed decisions.</p>
            </div>
            <div className="why-card">
              <h3>Transparent Methodology</h3>
              <p>Every report clearly documents assumptions, calculations, and limitations.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span className="site-footer-copyright">© 2026 Melara Capital AI. Educational use only — not investment advice.</span>
        <div className="site-footer-links">
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
      </footer>
    </div>
  );
}
