import Link from "next/link";

export default function TaxesPage() {
  return (
    <div className="panel">
      <div className="legal-page">
        <h1>Investment Taxes</h1>
        <p className="legal-updated">
          General educational overview — not individualized tax advice. Tax rules are complex and change;
          consult a qualified tax professional about your specific situation.
        </p>

        <p>
          Taxes aren&apos;t usually the first thing new investors think about, but over decades they can
          meaningfully affect what you actually keep. The good news: the rules are learnable, and a few
          basic habits go a long way.
        </p>

        <h2>Capital gains: only taxed when you sell</h2>
        <p>
          A capital gain is the profit from selling an investment for more than you paid. You generally
          only owe tax on a gain once it&apos;s <strong>realized</strong> — sold — not while you continue
          to hold the position, no matter how much it has gone up on paper.
        </p>
        <ul>
          <li>
            <strong>Short-term gains</strong> — assets held one year or less — are taxed as ordinary
            income, at your regular income tax rate.
          </li>
          <li>
            <strong>Long-term gains</strong> — assets held more than one year — qualify for lower capital
            gains tax rates, which is one reason many investors favor a buy-and-hold approach over frequent
            trading.
          </li>
        </ul>

        <h2>Dividends aren&apos;t all taxed the same way</h2>
        <p>
          <strong>Qualified dividends</strong> meet IRS holding-period requirements and get taxed at the
          lower long-term capital gains rate. <strong>Ordinary (non-qualified) dividends</strong> are
          taxed as regular income. Most dividends from U.S. stocks held for a reasonable period qualify,
          but it&apos;s worth checking the 1099-DIV your broker sends each year, which breaks this out.
        </p>

        <h2>Cost basis: what you actually paid</h2>
        <p>
          Your cost basis is what you originally paid for an investment (plus certain adjustments) — it&apos;s
          subtracted from the sale price to calculate your taxable gain or loss. Brokers track this for
          you and report it on Form 1099-B, but it&apos;s worth understanding, especially if you&apos;ve
          bought the same investment at different prices over time.
        </p>

        <h2>Tax-loss harvesting</h2>
        <p>
          Selling a losing investment to realize a loss can offset capital gains elsewhere (and up to
          $3,000 of ordinary income per year in the U.S.), reducing your tax bill. Watch out for the{" "}
          <strong>wash sale rule</strong>: if you buy the same or a &quot;substantially identical&quot;
          security within 30 days before or after the sale, the loss is disallowed for tax purposes.
        </p>

        <h2>Account type matters as much as the investment</h2>
        <p>
          Where you hold an investment can matter as much as what it is:
        </p>
        <ul>
          <li>
            <strong>Taxable brokerage accounts</strong> — no special tax treatment; gains and dividends are
            taxed in the year they occur, but you have full flexibility to withdraw anytime.
          </li>
          <li>
            <strong>Tax-deferred accounts</strong> (traditional 401(k)/IRA) — contributions may reduce your
            taxable income now; you pay ordinary income tax on withdrawals in retirement.
          </li>
          <li>
            <strong>Tax-free accounts</strong> (Roth 401(k)/IRA) — contributions are made with after-tax
            money, but qualified withdrawals in retirement are completely tax-free, including all the
            growth.
          </li>
        </ul>
        <p>
          See the <Link href="/dashboard/learn/retirement">Retirement Planning</Link> guide for more on
          how these accounts work.
        </p>

        <h2>A few habits that help</h2>
        <ul>
          <li>Favor long-term holding when it fits your goals, to access lower long-term rates.</li>
          <li>Use tax-advantaged accounts for investments you don&apos;t need to touch for years.</li>
          <li>Keep records of what you paid for each investment, especially outside a brokerage that tracks it automatically.</li>
          <li>Review your 1099s each year rather than assuming everything is handled for you.</li>
        </ul>

        <p className="legal-updated">
          This is a general educational overview, not individualized tax advice. Tax law varies by
          jurisdiction and situation — consult a qualified tax professional before making decisions.
        </p>
      </div>
    </div>
  );
}
