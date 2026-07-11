import { listReports } from "@/lib/reports";
import ReportsList from "@/components/ReportsList";

export default async function ReportsPage() {
  const reports = await listReports();

  return (
    <>
      <section className="dash-header">
        <h1>Saved reports</h1>
        <p>Reports you&apos;ve saved from the workspace.</p>
      </section>
      <ReportsList initialReports={reports} />
    </>
  );
}
