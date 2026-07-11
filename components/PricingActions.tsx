"use client";

import { useState } from "react";

export default function PricingActions({
  tierId,
  isCurrent,
  hasSubscription
}: {
  tierId: "pro" | "business";
  isCurrent: boolean;
  hasSubscription: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function subscribe() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: tierId })
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Failed to start checkout.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout.");
      setLoading(false);
    }
  }

  async function manageBilling() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Failed to open billing portal.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing portal.");
      setLoading(false);
    }
  }

  return (
    <div>
      {isCurrent ? (
        hasSubscription ? (
          <button className="secondary" onClick={manageBilling} disabled={loading}>
            {loading ? "Opening..." : "Manage billing"}
          </button>
        ) : (
          <span className="disclaimer">Current plan</span>
        )
      ) : (
        <button className="primary" onClick={subscribe} disabled={loading}>
          {loading ? "Redirecting..." : `Upgrade to ${tierId === "pro" ? "Pro" : "Business"}`}
        </button>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
