import Link from "next/link";

export default function FinancialStatementsPage() {
  return (
    <div className="panel">
      <div className="legal-page">
        <h1>Understanding Financial Statements</h1>
        <p className="legal-updated">Educational overview — not personalized investment or accounting advice.</p>

        <p>
          Every public company publishes three core financial statements. Together they answer three
          different questions: what does the company own and owe (balance sheet), how profitable is it
          (income statement), and where does its actual cash come from and go (cash flow statement)?
        </p>

        <h2>The Balance Sheet: a snapshot in time</h2>
        <p>
          The balance sheet shows a company&apos;s financial position at a single moment — like a photo,
          not a video. It always follows one equation:
        </p>
        <p>
          <strong>Assets = Liabilities + Shareholders&apos; Equity</strong>
        </p>
        <ul>
          <li><strong>Assets</strong> — what the company owns: cash, inventory, equipment, buildings, patents.</li>
          <li><strong>Liabilities</strong> — what it owes: loans, bonds, accounts payable, unpaid bills.</li>
          <li>
            <strong>Shareholders&apos; equity</strong> — what&apos;s left over for owners after paying off
            all liabilities; also called book value.
          </li>
        </ul>
        <p>
          A quick health check: compare current assets (cash and things convertible to cash within a
          year) to current liabilities (bills due within a year). If current liabilities are much larger,
          that&apos;s worth understanding before going further.
        </p>

        <h2>The Income Statement: profitability over a period</h2>
        <p>
          Also called the profit &amp; loss statement (P&amp;L), this covers a stretch of time — a
          quarter or a year — and works top to bottom:
        </p>
        <ul>
          <li><strong>Revenue</strong> (the &quot;top line&quot;) — total sales.</li>
          <li><strong>Cost of goods sold</strong> — direct costs of producing what was sold.</li>
          <li><strong>Gross profit</strong> — revenue minus cost of goods sold.</li>
          <li><strong>Operating expenses</strong> — R&amp;D, marketing, salaries, overhead.</li>
          <li><strong>Operating income</strong> — gross profit minus operating expenses.</li>
          <li><strong>Net income</strong> (the &quot;bottom line&quot;) — what&apos;s left after interest, taxes, and everything else.</li>
        </ul>
        <p>
          Margins — gross margin, operating margin, net margin — express each profit level as a
          percentage of revenue, which makes it easy to compare profitability across companies of
          different sizes or track a single company&apos;s trend over time.
        </p>

        <h2>The Cash Flow Statement: where the cash actually went</h2>
        <p>
          Net income includes non-cash items (like depreciation) and can be affected by accounting
          choices, so a profitable company can still run short on cash. The cash flow statement tracks
          real cash movement across three buckets:
        </p>
        <ul>
          <li><strong>Operating activities</strong> — cash generated or used by core business operations.</li>
          <li><strong>Investing activities</strong> — cash spent on or received from buying/selling assets like equipment or other companies.</li>
          <li><strong>Financing activities</strong> — cash from issuing debt or stock, or spent on debt repayment, dividends, and buybacks.</li>
        </ul>
        <p>
          <strong>Free cash flow</strong> (operating cash flow minus capital expenditures) is one of the
          most closely watched numbers — it&apos;s the cash actually available to reward shareholders or
          reinvest, after keeping the business running.
        </p>

        <h2>Reading them together</h2>
        <p>
          No single statement tells the whole story. A company can show rising revenue (income statement)
          while burning cash (cash flow statement) and piling on debt (balance sheet) — a combination
          worth investigating rather than ignoring. Looking at trends across several periods, not just one
          snapshot, usually matters more than any single number.
        </p>

        <h2>Where to see this in practice</h2>
        <p>
          The <Link href="/dashboard/company">Company Research</Link> workspace automatically pulls a
          real company&apos;s income statement, balance sheet, and cash flow statement from its SEC
          filings and calculates the key ratios discussed here. The{" "}
          <Link href="/dashboard/learn/glossary">glossary</Link> has quick definitions for any term you
          run into along the way.
        </p>

        <p className="legal-updated">
          Educational content only. Not a substitute for professional accounting or investment advice.
        </p>
      </div>
    </div>
  );
}
