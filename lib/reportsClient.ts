import type { ReportModule } from "@/lib/reports";

export async function saveReport(payload: {
  title: string;
  module: ReportModule;
  input: unknown;
  output: string;
}): Promise<{ error?: string }> {
  const response = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    return { error: data.error || "Failed to save report." };
  }
  return {};
}
