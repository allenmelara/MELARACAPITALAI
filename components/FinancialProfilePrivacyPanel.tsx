"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FinancialProfile } from "@/lib/financialProfile";

export default function FinancialProfilePrivacyPanel({ profile }: { profile: FinancialProfile | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const completed = Boolean(profile?.onboardingCompletedAt);

  async function deleteMyData() {
    if (!window.confirm("Delete your financial profile? This can't be undone.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/financial-profile", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete your financial profile.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete your financial profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h2 style={{ marginTop: 0 }}>Financial profile & privacy</h2>
      <p className="disclaimer" style={{ marginTop: 0 }}>
        {completed
          ? `You completed your financial profile${profile?.consentGivenAt ? ` and consented on ${new Date(profile.consentGivenAt).toLocaleDateString()}` : ""}.`
          : profile?.onboardingSkipped
            ? "You skipped the financial profile questionnaire. You can fill it in anytime."
            : "You haven't set up your financial profile yet."}
      </p>
      <div className="actions">
        <Link href="/dashboard/onboarding" className="secondary">
          {completed ? "Edit profile" : "Set up profile"}
        </Link>
        {completed && (
          <a className="secondary" href="/api/financial-profile/export">
            Export my data
          </a>
        )}
        {completed && (
          <button className="secondary" onClick={deleteMyData} disabled={busy}>
            {busy ? "Deleting…" : "Delete my data"}
          </button>
        )}
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
