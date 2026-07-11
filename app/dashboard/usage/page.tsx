import { redirect } from "next/navigation";
import { getPlan } from "@/lib/profile";
import { listUsageSince, startOfCurrentMonthIso, type UsageEvent } from "@/lib/usage";
import { PLAN_LIMITS } from "@/lib/limits";
import UsageBar from "@/components/UsageBar";
import UsageAnalyticsChart, { type MonthlyUsage } from "@/components/UsageAnalyticsChart";

const MONTHS_BACK = 6;

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function aggregateByMonth(events: UsageEvent[]): MonthlyUsage[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const buckets = new Map<string, MonthlyUsage>(
    keys.map((k) => [k, { month: monthLabel(k), credits: 0, chat: 0, documents: 0 }])
  );

  for (const event of events) {
    const key = monthKey(event.created_at);
    const bucket = buckets.get(key);
    if (!bucket) continue; // outside the displayed window
    if (event.kind === "analyze") bucket.credits += 1;
    else if (event.kind === "chat") bucket.chat += 1;
    else if (event.kind === "document") bucket.documents += 1;
  }

  return keys.map((k) => buckets.get(k)!);
}

export default async function UsagePage() {
  const plan = await getPlan();
  if (plan !== "business") {
    redirect("/pricing");
  }

  const since = new Date();
  since.setMonth(since.getMonth() - (MONTHS_BACK - 1));
  since.setDate(1);

  const events = await listUsageSince(since.toISOString());
  const monthly = aggregateByMonth(events);

  const sinceIso = startOfCurrentMonthIso();
  const creditsThisMonth = events.filter((e) => e.kind === "analyze" && e.created_at >= sinceIso).length;
  const chatThisMonth = events.filter((e) => e.kind === "chat" && e.created_at >= sinceIso).length;
  const documentsThisMonth = events.filter((e) => e.kind === "document" && e.created_at >= sinceIso).length;
  const limits = PLAN_LIMITS.business;

  return (
    <>
      <section className="dash-header">
        <h1>Usage analytics</h1>
        <p>AI Research Credits, chat, and document usage over the last {MONTHS_BACK} months.</p>
      </section>

      <div className="panel">
        <div className="usage-bar-grid">
          <UsageBar label="AI Research Credits (this month)" used={creditsThisMonth} limit={limits.aiResearchCredits} />
          <UsageBar label="AI chat messages (this month)" used={chatThisMonth} limit={limits.chatMessagesPerMonth} />
          <UsageBar label="Document uploads (this month)" used={documentsThisMonth} limit={limits.documentUploadsPerMonth} />
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>Monthly breakdown</h2>
        <UsageAnalyticsChart data={monthly} />
      </div>
    </>
  );
}
