import Link from "next/link";
import { money } from "@/lib/finance";
import type { UpcomingBill } from "@/lib/bills";

export default function UpcomingBills({ bills }: { bills: UpcomingBill[] }) {
  const upcoming = bills.slice(0, 5);

  return (
    <section className="dash-section">
      <h2>Upcoming bills</h2>
      {upcoming.length === 0 ? (
        <>
          <p className="disclaimer">No bills tracked yet.</p>
          <Link href="/dashboard/accounts" className="secondary">
            Add a bill
          </Link>
        </>
      ) : (
        <ul className="dash-list">
          {upcoming.map((b) => (
            <li key={b.id}>
              <Link href="/dashboard/accounts">
                <span className="dash-list-title">{b.name}</span>
                <span className="dash-list-meta">
                  {money(b.amount)} · due {new Date(b.nextDueDate).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
