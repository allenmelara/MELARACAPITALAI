"use client";

import { useState } from "react";

type FlagKey = "hasHealthInsurance" | "hasLifeInsurance" | "hasDisabilityInsurance" | "hasHomeOrRentersInsurance";

const FLAGS: Array<{ key: FlagKey; label: string }> = [
  { key: "hasHealthInsurance", label: "Health insurance" },
  { key: "hasLifeInsurance", label: "Life insurance" },
  { key: "hasDisabilityInsurance", label: "Disability insurance" },
  { key: "hasHomeOrRentersInsurance", label: "Home or renters insurance" }
];

function toSelectValue(v: boolean | null): string {
  return v === null ? "" : v ? "yes" : "no";
}

function fromSelectValue(v: string): boolean | null {
  return v === "" ? null : v === "yes";
}

export default function InsuranceFlagsForm({
  initial
}: {
  initial: Record<FlagKey, boolean | null>;
}) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/financial-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save.");
      setMessage("Saved — your Financial Health Score will reflect this next time you view it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h2 style={{ marginTop: 0 }}>Insurance readiness</h2>
      <p className="disclaimer" style={{ marginTop: 0 }}>
        A few quick questions — self-reported, optional, and used only to calculate the insurance readiness
        category of your score.
      </p>
      <div className="form-grid">
        {FLAGS.map(({ key, label }) => (
          <label key={key}>
            {label}
            <select
              value={toSelectValue(values[key])}
              onChange={(e) => setValues((current) => ({ ...current, [key]: fromSelectValue(e.target.value) }))}
            >
              <option value="">Prefer not to say</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        ))}
      </div>
      <div className="actions">
        <button className="primary" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      {message && <div className="notice">{message}</div>}
    </div>
  );
}
