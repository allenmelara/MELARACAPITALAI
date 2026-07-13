"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "melara:onboarding-nudge-dismissed";

export default function OnboardingNudge({ eligible }: { eligible: boolean }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  if (!eligible || dismissed) return null;

  return (
    <div className="panel onboarding-nudge">
      <div>
        <strong>Set up your financial profile</strong>
        <p className="disclaimer" style={{ margin: "4px 0 0" }}>
          Two minutes, fully optional — helps Melara personalize your dashboard.
        </p>
      </div>
      <div className="onboarding-nudge-actions">
        <Link href="/dashboard/onboarding" className="primary">
          Start
        </Link>
        <button className="dash-sidebar-toggle" onClick={dismiss} aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
