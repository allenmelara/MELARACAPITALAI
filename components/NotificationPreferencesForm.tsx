"use client";

import { useState } from "react";
import type { NotificationPreferences } from "@/lib/notificationPreferences";

const TYPE_LABELS: Array<{ key: keyof Omit<NotificationPreferences, "updatedAt" | "emailEnabled" | "inAppEnabled">; label: string }> = [
  { key: "dailyCheckin", label: "Daily check-in" },
  { key: "weeklyRecap", label: "Weekly recap" },
  { key: "monthlyReport", label: "Monthly report" },
  { key: "goalMilestone", label: "Goal milestones" },
  { key: "streakMilestone", label: "Streak milestones" },
  { key: "scoreChange", label: "Financial health score changes" },
  { key: "budgetChallenge", label: "Budget challenges" },
  { key: "billReminders", label: "Bill reminders" },
  { key: "priceAlerts", label: "Watchlist price alerts" }
];

export default function NotificationPreferencesForm({ initial }: { initial: NotificationPreferences }) {
  const [preferences, setPreferences] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function toggle(key: keyof NotificationPreferences) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save preferences.");
      setMessage("Preferences saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="onboarding-chip-grid">
        {TYPE_LABELS.map(({ key, label }) => (
          <label key={key} className="checkbox-row">
            <input type="checkbox" checked={preferences[key]} onChange={() => toggle(key)} />
            {label}
          </label>
        ))}
      </div>
      <div className="onboarding-consent" style={{ marginTop: 12 }}>
        <label className="checkbox-row">
          <input type="checkbox" checked={preferences.inAppEnabled} onChange={() => toggle("inAppEnabled")} />
          In-app notifications
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={preferences.emailEnabled} onChange={() => toggle("emailEnabled")} />
          Email notifications
        </label>
      </div>
      <div className="actions" style={{ marginTop: 14 }}>
        <button className="primary" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save preferences"}
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      {message && <div className="notice">{message}</div>}
    </div>
  );
}
