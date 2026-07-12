import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Melara Capital AI"
};

export default function TermsPage() {
  return (
    <div className="shell">
      <nav className="nav">
        <Link href="/" className="brand">
          Melara Capital <span>AI</span>
        </Link>
        <div className="nav-actions">
          <Link href="/privacy" className="nav-note">
            Privacy Policy
          </Link>
          <Link href="/login" className="secondary">
            Log in
          </Link>
        </div>
      </nav>
      <main className="main">
        <div className="legal-page">
          <h1>Terms of Service</h1>
          <p className="legal-updated">Last updated: July 11, 2026</p>

          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of Melara Capital
            AI (the &quot;Service&quot;), operated by Melara Capital AI (&quot;we,&quot; &quot;us,&quot;
            or &quot;our&quot;). By creating an account or using the Service, you agree to these Terms.
            If you do not agree, do not use the Service.
          </p>

          <h2>1. What the Service Is — and Isn&apos;t</h2>
          <p>
            Melara Capital AI is an educational, AI-powered financial research and analysis workspace.
            It helps you build company valuations, real estate models, wealth projections, and
            AI-generated research reports from data you provide and from publicly available sources
            such as SEC EDGAR filings and market price data.
          </p>
          <p>
            <strong>
              Melara Capital AI is not a registered investment adviser, broker-dealer, accounting firm,
              or law firm.
            </strong>{" "}
            Nothing produced by the Service — including AI-generated reports, ratings (such as any
            Buy/Hold/Sell rating), calculators, or chat responses — constitutes individualized
            investment, tax, legal, accounting, or fiduciary advice. All outputs are educational and
            general in nature, may contain errors, and should not be the sole basis for any financial
            decision. You are solely responsible for verifying any information before relying on it and
            for your own investment, tax, and legal decisions. Consult a qualified, licensed professional
            before acting on anything the Service produces.
          </p>

          <h2>2. Accounts</h2>
          <p>
            You must be at least 18 years old to use the Service. You&apos;re responsible for
            maintaining the confidentiality of your account credentials and for all activity under your
            account. Provide accurate information when creating an account and keep it up to date.
          </p>

          <h2>3. Subscriptions and Billing</h2>
          <ul>
            <li>
              The Service offers Free, Pro, and Business plans as described on our{" "}
              <Link href="/pricing">Pricing</Link> page, differentiated by AI Research Credits and
              other usage limits and features.
            </li>
            <li>Paid plans are billed in advance on a recurring monthly basis via Stripe, our payment processor. We do not store your card details.</li>
            <li>
              You can cancel a paid plan at any time from the billing portal; cancellation takes effect
              at the end of your current billing period, and you retain paid-plan access until then.
            </li>
            <li>
              Fees are non-refundable except where required by law. We may change plan pricing or
              features with reasonable notice; continued use after a change constitutes acceptance.
            </li>
            <li>
              Usage limits (AI Research Credits, chat messages, document uploads, and similar) reset
              monthly and do not roll over.
            </li>
          </ul>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose or in violation of any applicable regulation.</li>
            <li>
              Attempt to reverse-engineer, scrape at scale, or circumvent usage limits or access
              controls.
            </li>
            <li>Use the Service to generate content intended to deceive or defraud any person.</li>
            <li>Share your account credentials with others or resell access to the Service.</li>
            <li>Upload data you don&apos;t have the right to share, or that infringes another party&apos;s rights.</li>
          </ul>

          <h2>5. Your Content</h2>
          <p>
            You retain ownership of the financial data, documents, and inputs you provide, and of the
            reports generated for you. You grant us a limited license to process that data solely to
            operate and improve the Service (for example, to generate your reports and enforce plan
            limits). See our <Link href="/privacy">Privacy Policy</Link> for how we handle your data.
          </p>

          <h2>6. Third-Party Services</h2>
          <p>
            The Service relies on third-party providers, including Supabase (authentication and
            database), Stripe (payments), Anthropic (AI-generated analysis), and market/financial data
            providers such as Finnhub and SEC EDGAR. We aren&apos;t responsible for the availability or
            accuracy of these third-party services.
          </p>

          <h2>7. Disclaimers and Limitation of Liability</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind, express or
            implied, including accuracy, reliability, or fitness for a particular purpose. To the
            maximum extent permitted by law, Melara Capital AI is not liable for any indirect,
            incidental, or consequential damages, or for any financial losses arising from decisions
            made using the Service. Our total liability for any claim is limited to the amount you paid
            us in the twelve months before the claim arose.
          </p>

          <h2>8. Termination</h2>
          <p>
            We may suspend or terminate your access if you violate these Terms. You may stop using the
            Service and delete your account at any time by contacting us.
          </p>

          <h2>9. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. We&apos;ll update the &quot;Last updated&quot;
            date above; continued use of the Service after changes take effect constitutes acceptance
            of the revised Terms.
          </p>

          <h2>10. Governing Law</h2>
          <p>
            These Terms are governed by the laws of [Insert your governing state/jurisdiction],
            without regard to conflict-of-law principles.
          </p>

          <h2>11. Contact</h2>
          <p>
            Questions about these Terms? Contact us at{" "}
            <a href="mailto:allenmelara@gmail.com">allenmelara@gmail.com</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
