import Link from "next/link";

export default function RetirementPage() {
  return (
    <div className="panel">
      <div className="legal-page">
        <h1>Retirement Planning</h1>
        <p className="legal-updated">
          General educational overview — not individualized financial or retirement advice.
        </p>

        <p>
          Retirement planning is really just answering one question with numbers: how much do I need to
          have saved so that, combined with other income, I can stop working and still cover my expenses
          for the rest of my life? The accounts and rules below are the tools for getting there.
        </p>

        <h2>401(k): the employer-sponsored option</h2>
        <p>
          A 401(k) is offered through your employer. Contributions come directly out of your paycheck,
          and many employers offer a <strong>match</strong> — extra money added based on how much you
          contribute, up to a limit. An unmatched employer match is often described as leaving free money
          on the table, since it&apos;s an instant, guaranteed return that beats nearly any investment.
        </p>
        <p>
          Some 401(k) contributions <strong>vest</strong> over time — meaning you don&apos;t fully own the
          employer&apos;s contributions until you&apos;ve worked there long enough. Check your plan&apos;s
          vesting schedule before assuming that balance is entirely yours.
        </p>

        <h2>IRA: the personal option</h2>
        <p>
          An IRA (Individual Retirement Account) isn&apos;t tied to an employer — anyone with earned
          income can open one directly with a brokerage. Contribution limits are generally lower than a
          401(k)&apos;s, but IRAs often offer far more investment choices.
        </p>

        <h2>Traditional vs. Roth</h2>
        <p>Both 401(k)s and IRAs come in two flavors, and the difference is entirely about when you pay tax:</p>
        <ul>
          <li>
            <strong>Traditional</strong> — contributions may reduce your taxable income this year; you pay
            ordinary income tax when you withdraw in retirement.
          </li>
          <li>
            <strong>Roth</strong> — contributions are made with money you&apos;ve already paid tax on, but
            qualified withdrawals in retirement — including decades of growth — are completely tax-free.
          </li>
        </ul>
        <p>
          A common rule of thumb: Traditional tends to favor people who expect to be in a lower tax
          bracket in retirement than they are now; Roth tends to favor people who expect the opposite, or
          who want tax-free flexibility later. Many people reasonably split contributions between both.
        </p>

        <h2>Required Minimum Distributions (RMDs)</h2>
        <p>
          Traditional retirement accounts require you to start withdrawing a minimum amount each year
          once you reach a certain age (currently 73 in the U.S.) — the IRS eventually wants its tax
          revenue. Roth IRAs are not subject to RMDs during the original owner&apos;s lifetime.
        </p>

        <h2>How much is &quot;enough&quot;?</h2>
        <p>
          There&apos;s no single right answer, but two common reference points:
        </p>
        <ul>
          <li>
            <strong>Safe withdrawal rate</strong> — a frequently cited starting point is withdrawing
            around 4% of your portfolio in the first year of retirement, then adjusting for inflation —
            implying a target of roughly 25x your annual expenses saved. This is a rough guideline, not a
            guarantee, and depends heavily on your time horizon and market conditions.
          </li>
          <li>
            <strong>Social Security</strong> — for U.S. workers, benefits are based on lifetime earnings
            and grow the longer you delay claiming, up to age 70 — often a meaningful piece of the puzzle
            alongside personal savings.
          </li>
        </ul>

        <h2>Put numbers to your own plan</h2>
        <p>
          The <Link href="/dashboard/wealth">Wealth Planner</Link> turns your income, expenses, current
          savings, and contribution rate into a concrete retirement balance and sustainable withdrawal
          projection, so you can see where your current plan is heading rather than relying on rules of
          thumb alone.
        </p>

        <p className="legal-updated">
          Educational content only, not individualized retirement or tax advice. Contribution limits, RMD
          ages, and tax rules change — verify current figures with a qualified professional or the IRS.
        </p>
      </div>
    </div>
  );
}
