"use client";

import { useState } from "react";

export default function BrandingForm({
  initialBrandName,
  initialBrandLogoUrl
}: {
  initialBrandName: string;
  initialBrandLogoUrl: string;
}) {
  const [brandName, setBrandName] = useState(initialBrandName);
  const [brandLogoUrl, setBrandLogoUrl] = useState(initialBrandLogoUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/settings/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName, brandLogoUrl })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save branding.");
      setMessage("Branding saved. New PDF exports will use it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save branding.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-grid">
      <label className="full">
        Company name shown on exported PDFs
        <input
          placeholder="Your firm's name"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
        />
      </label>
      <label className="full">
        Logo URL
        <input
          placeholder="https://example.com/logo.png"
          value={brandLogoUrl}
          onChange={(e) => setBrandLogoUrl(e.target.value)}
        />
      </label>
      <div className="actions full">
        <button className="primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save branding"}
        </button>
      </div>
      {message && <div className="notice full">{message}</div>}
      {error && <div className="error full">{error}</div>}
    </div>
  );
}
