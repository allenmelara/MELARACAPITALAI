import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getUser } from "@/lib/supabase/server";
import { getReport } from "@/lib/reports";
import { logError } from "@/lib/logger";
import { ReportDocument } from "@/lib/pdf/ReportDocument";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const report = await getReport(id);
    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const buffer = await renderToBuffer(<ReportDocument report={report} />);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sanitizeFilename(report.title)}.pdf"`
      }
    });
  } catch (error) {
    logError("reports.exportPdf", error);
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  }
}

function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[^a-z0-9\-_ ]/gi, "")
      .trim()
      .slice(0, 80) || "report"
  );
}
