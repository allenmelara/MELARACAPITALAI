import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Melara Capital AI"
};

export default function PrivacyPage() {
  return (
    <div className="shell">
      <nav className="nav">
        <Link href="/" className="brand">
          Melara Capital <span>AI</span>
        </Link>
        <div className="nav-actions">
          <Link href="/terms" className="nav-note">
            Terms of Service
          </Link>
          <Link href="/login" className="secondary">
            Log in
          </Link>
        </div>
      </nav>
      <main className="main">
        <div className="legal-page">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: July 11, 2026</p>

          <p>
            This Privacy Policy explains what information Melara Capital AI (&quot;we,&quot;
            &quot;us,&quot; or &quot;our&quot;) collects, how we use it, and the choices you have. By
            using the Service, you agree to this Policy.
          </p>

          <h2>1. Information We Collect</h2>
          <ul>
            <li>
              <strong>Account information:</strong> your email address and password (handled securely
              by our authentication provider, Supabase — we never see or store your plaintext
              password).
            </li>
            <li>
              <strong>Content you provide:</strong> financial figures, tickers, pasted documents, and
              assumptions you enter into the Company Research, Document Analysis, Real Estate, and
              Wealth Planner tools, plus any reports you choose to save.
            </li>
            <li>
              <strong>Billing information:</strong> your subscription plan and Stripe customer/
              subscription identifiers. Full payment card details are handled entirely by Stripe and
              never touch our servers.
            </li>
            <li>
              <strong>Usage data:</strong> a log of billable AI actions (report generations, chat
              messages, document uploads) used to enforce plan limits and, on the Business plan, to
              show you usage analytics.
            </li>
            <li>
              <strong>Technical data:</strong> standard server logs (timestamps, error types) for
              debugging and abuse prevention. We deliberately avoid logging the contents of your
              financial data alongside error logs.
            </li>
          </ul>

          <h2>2. How We Use Information</h2>
          <ul>
            <li>To provide, maintain, and improve the Service.</li>
            <li>To generate the AI-powered analysis and reports you request.</li>
            <li>To process billing and manage your subscription.</li>
            <li>To enforce plan limits (AI Research Credits, chat messages, document uploads).</li>
            <li>To communicate with you about your account, billing, or changes to our policies.</li>
            <li>To detect, prevent, and address fraud, abuse, or security issues.</li>
          </ul>

          <h2>3. How Your Data Is Shared</h2>
          <p>We share data only with the service providers necessary to operate the Service:</p>
          <ul>
            <li>
              <strong>Supabase</strong> — authentication and database hosting (your account, saved
              reports, and usage data are stored here).
            </li>
            <li>
              <strong>Stripe</strong> — payment processing and subscription billing.
            </li>
            <li>
              <strong>Anthropic (Claude)</strong> — the data and inputs you submit for analysis are sent
              to Anthropic&apos;s API to generate your reports and chat responses.
            </li>
            <li>
              <strong>Finnhub and SEC EDGAR</strong> — used to fetch public market prices and public SEC
              filings for the company you look up; we don&apos;t send your personal account information
              to these providers.
            </li>
          </ul>
          <p>We do not sell your personal information to third parties.</p>

          <h2>4. Data Retention and Deletion</h2>
          <p>
            We retain your account and saved reports for as long as your account is active. You can
            delete individual saved reports yourself from the Reports page at any time. To delete your
            entire account and associated data, contact us at{" "}
            <a href="mailto:allenmelara@gmail.com">allenmelara@gmail.com</a> and we&apos;ll process the
            request promptly.
          </p>

          <h2>5. Data Security</h2>
          <p>
            Data is encrypted in transit (HTTPS) and at rest by our infrastructure providers. Access to
            your data is restricted by row-level security so that only you (and, where you explicitly
            configure it, your own exports) can access your reports and account data.
          </p>

          <h2>6. Cookies</h2>
          <p>
            We use a small number of essential cookies to keep you signed in and maintain your session.
            We don&apos;t use third-party advertising or tracking cookies.
          </p>

          <h2>7. Children&apos;s Privacy</h2>
          <p>
            The Service is not directed to individuals under 18, and we do not knowingly collect
            personal information from children.
          </p>

          <h2>8. Your Rights</h2>
          <p>
            Depending on where you live, you may have rights to access, correct, or delete your personal
            information, or to object to certain processing. Contact us at{" "}
            <a href="mailto:allenmelara@gmail.com">allenmelara@gmail.com</a> to exercise these rights.
          </p>

          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We&apos;ll update the &quot;Last
            updated&quot; date above when we do.
          </p>

          <h2>10. Contact</h2>
          <p>
            Questions about this Policy? Contact us at{" "}
            <a href="mailto:allenmelara@gmail.com">allenmelara@gmail.com</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
