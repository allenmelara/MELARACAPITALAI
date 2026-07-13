import Link from "next/link";
import { percent } from "@/lib/finance";
import type { FinancialGoal } from "@/lib/financialGoals";

export default function GoalsSummary({ goals }: { goals: FinancialGoal[] }) {
  const topGoals = goals.slice(0, 5);

  return (
    <section className="dash-section">
      <h2>Financial goals</h2>
      {topGoals.length === 0 ? (
        <div className="dash-section-empty">
          <p className="disclaimer">No goals yet — set a target and track your progress toward it.</p>
          <Link href="/dashboard/goals" className="secondary">
            Add a goal
          </Link>
        </div>
      ) : (
        <ul className="dash-list">
          {topGoals.map((g) => (
            <li key={g.id}>
              <Link href="/dashboard/goals">
                <span className="dash-list-title">{g.name}</span>
                <span className="dash-list-meta">{percent(Math.min(1, g.currentAmount / g.targetAmount))} funded</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
