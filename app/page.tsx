import Link from "next/link";

export default function Home() {
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
            <h1>Turn financial data into decisions.</h1>
            <p>
              Analyze companies, real estate deals, and personal finances, then
              transform raw financial information into structured research
              reports powered by Claude.
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
      </main>
    </div>
  );
}
