import Link from "next/link";
import { Building2, FileText, Home, PiggyBank } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { listReports } from "@/lib/reports";
import { listRecentChatReports } from "@/lib/reportChat";

const MODULE_LABELS: Record<string, string> = {
  company: "Company Research",
  document: "Document Analysis",
  real_estate: "Real Estate",
  wealth: "Wealth Planner"
};

export default async function DashboardPage() {
  const user = await getUser();
  const [reports, recentChats] = await Promise.all([listReports(), listRecentChatReports(5)]);

  const recentReports = reports.slice(0, 5);
  const recentDocuments = reports.filter((r) => r.module === "document").slice(0, 5);
  const firstName = user?.email ? user.email.split("@")[0] : "";

  return (
    <>
      <section className="dash-header">
        <h1>Welcome back{firstName ? `, ${firstName}` : ""}.</h1>
        <p>Continue where you left off, or start something new.</p>
      </section>

      <section className="dash-quick-actions">
        <Link href="/dashboard/company" className="dash-action-card">
          <Building2 size={20} />
          <span>Analyze Company</span>
        </Link>
        <Link href="/dashboard/documents" className="dash-action-card">
          <FileText size={20} />
          <span>Upload Financial Statement</span>
        </Link>
        <Link href="/dashboard/real-estate" className="dash-action-card">
          <Home size={20} />
          <span>Analyze Property</span>
        </Link>
        <Link href="/dashboard/wealth" className="dash-action-card">
          <PiggyBank size={20} />
          <span>Create Wealth Plan</span>
        </Link>
      </section>

      <div className="dash-columns">
        <section className="dash-section">
          <h2>Recent Reports</h2>
          {recentReports.length === 0 ? (
            <p className="disclaimer">No reports yet — try Company Research to get started.</p>
          ) : (
            <ul className="dash-list">
              {recentReports.map((r) => (
                <li key={r.id}>
                  <Link href="/dashboard/reports">
                    <span className="dash-list-title">{r.title}</span>
                    <span className="dash-list-meta">
                      {MODULE_LABELS[r.module] ?? r.module} · {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-section">
          <h2>Recent Document Uploads</h2>
          {recentDocuments.length === 0 ? (
            <p className="disclaimer">No documents analyzed yet.</p>
          ) : (
            <ul className="dash-list">
              {recentDocuments.map((r) => (
                <li key={r.id}>
                  <Link href="/dashboard/reports">
                    <span className="dash-list-title">{r.title}</span>
                    <span className="dash-list-meta">{new Date(r.created_at).toLocaleDateString()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-section">
          <h2>Recent AI Conversations</h2>
          {recentChats.length === 0 ? (
            <p className="disclaimer">No conversations yet — open a saved report and ask a question.</p>
          ) : (
            <ul className="dash-list">
              {recentChats.map((c) => (
                <li key={c.reportId}>
                  <Link href="/dashboard/reports">
                    <span className="dash-list-title">{c.title}</span>
                    <span className="dash-list-meta">
                      {MODULE_LABELS[c.module] ?? c.module} · {new Date(c.lastMessageAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
