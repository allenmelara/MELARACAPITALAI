"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

const STAGES = [
  "Resolving SEC filer",
  "Fetching company facts",
  "Parsing financial statements",
  "Loading live market price"
];

// Animated staged progress for the SEC import. The lookup itself is a single
// request, so we advance through the stages on a timer for feedback and settle
// them all to "complete" the moment the data lands (done = true).
export default function ImportProgress({ done }: { done: boolean }) {
  const [reached, setReached] = useState(0);

  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => {
      // Advance, but hold on the final stage until the data actually arrives.
      setReached((r) => Math.min(r + 1, STAGES.length - 1));
    }, 650);
    return () => clearInterval(timer);
  }, [done]);

  return (
    <div className="import-progress" role="status" aria-live="polite">
      <div className="import-progress-head">
        <Loader2 size={16} className={done ? "" : "spin"} />
        <span>{done ? "Import complete" : "Importing company data…"}</span>
      </div>
      <ol className="import-stages">
        {STAGES.map((label, i) => {
          const state = done || i < reached ? "done" : i === reached ? "active" : "pending";
          return (
            <li key={label} className={`import-stage import-stage-${state}`}>
              <span className="import-stage-icon">
                {state === "done" ? (
                  <Check size={13} />
                ) : state === "active" ? (
                  <Loader2 size={13} className="spin" />
                ) : (
                  <span className="import-stage-dot" />
                )}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
