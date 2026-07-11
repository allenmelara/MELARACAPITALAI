import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getUser } from "@/lib/supabase/server";
import { getReport } from "@/lib/reports";
import { getProfile } from "@/lib/profile";
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
    const [report, profile] = await Promise.all([getReport(id), getProfile()]);
    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const buffer = await renderToBuffer(
      <ReportDocument
        report={report}
        branding={{
          plan: profile?.plan ?? "free",
          brandName: profile?.brand_name,
          brandLogoUrl: profile?.brand_logo_url
        }}
      />
    );

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
