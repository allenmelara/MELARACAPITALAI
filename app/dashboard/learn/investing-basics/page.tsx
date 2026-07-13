import Link from "next/link";

export default function InvestingBasicsPage() {
  return (
    <div className="panel">
      <div className="legal-page">
        <h1>Beginner Investing</h1>
        <p className="legal-updated">Educational overview — not personalized investment advice.</p>

        <p>
          Investing is putting money to work today with the goal of having more of it later, by owning
          assets — stocks, bonds, funds, real estate — that can grow in value or pay you income over
          time. It&apos;s different from saving: saving protects money, investing risks some of it in
          exchange for the chance of a higher return.
        </p>

        <h2>Start with the goal, not the stock</h2>
        <p>
          Before picking any investment, get clear on why you&apos;re investing and when you&apos;ll need
          the money. Retirement in 30 years, a house down payment in 3 years, and an emergency fund you
          might need next month all call for very different approaches — the first can ride out a lot of
          short-term volatility, the last two generally shouldn&apos;t be in the stock market at all.
        </p>

        <h2>Risk and return are linked</h2>
        <p>
          Higher potential returns generally come with higher potential losses — there&apos;s no reliable
          way to get one without the other. Cash and short-term bonds are low-risk and low-return. Stocks
          have historically returned more over long periods, but with real, sometimes painful, short-term
          drops. Your job isn&apos;t to avoid risk entirely — it&apos;s to take on a level of risk you can
          actually live with, including during a bad year.
        </p>

        <h2>Diversification is the closest thing to a free lunch</h2>
        <p>
          Owning many different investments — across companies, industries, and asset classes — means no
          single bad outcome can wipe you out. Most beginners get broad diversification most easily
          through low-cost index funds or ETFs that hold hundreds or thousands of companies at once,
          rather than picking individual stocks.
        </p>

        <h2>Time in the market vs. timing the market</h2>
        <p>
          Trying to predict short-term market moves is extremely difficult even for professionals.
          Historically, staying invested for long periods has mattered far more than getting the timing
          right. A simple, disciplined approach — like investing a fixed amount on a regular schedule
          (dollar-cost averaging) — removes the temptation to guess and smooths out the price you pay
          over time.
        </p>

        <h2>Fees quietly compound too</h2>
        <p>
          A fund charging 1% a year versus 0.05% a year sounds small, but compounded over decades it can
          consume a meaningful share of your returns. Check a fund&apos;s expense ratio before buying it
          — for most long-term investors, low-cost, broadly diversified funds are hard to beat after fees.
        </p>

        <h2>Common beginner mistakes</h2>
        <ul>
          <li>Investing money you&apos;ll need within the next 1&ndash;3 years in volatile assets.</li>
          <li>Putting most or all of a portfolio into one stock, sector, or trend.</li>
          <li>Panic-selling during a downturn and locking in losses that would have recovered.</li>
          <li>Chasing whatever has performed best recently, rather than what fits your goals.</li>
          <li>Ignoring fees, taxes, and account type (see the Taxes and Retirement guides).</li>
        </ul>

        <h2>Where to go from here</h2>
        <p>
          Once you&apos;re comfortable with the basics, the{" "}
          <Link href="/dashboard/company">Company Research</Link> workspace can help you dig into a
          specific company&apos;s valuation, and the{" "}
          <Link href="/dashboard/wealth">Wealth Planner</Link> can help translate your savings rate and
          goals into a concrete projection. The <Link href="/dashboard/learn/glossary">glossary</Link>{" "}
          is there whenever a term comes up that you don&apos;t recognize.
        </p>

        <p className="legal-updated">
          Educational content only — not individualized investment advice. Investing involves risk,
          including possible loss of principal.
        </p>
      </div>
    </div>
  );
}
