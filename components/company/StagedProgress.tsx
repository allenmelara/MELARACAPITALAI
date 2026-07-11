"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

// Generic animated staged progress bar, shared by the SEC import (Step 2) and
// the research generation (Step 4). The underlying work is a single request,
// so we advance through the stages on a timer for feedback and settle them
// all to "complete" the moment the real data lands (done = true).
export default function StagedProgress({
  stages,
  done,
  activeLabel,
  doneLabel,
  intervalMs = 650
}: {
  stages: string[];
  done: boolean;
  activeLabel: string;
  doneLabel: string;
  intervalMs?: number;
}) {
  const [reached, setReached] = useState(0);

  useEffect(() => {
    if (done) return;
    setReached(0);
    const timer = setInterval(() => {
      // Advance, but hold on the final stage until the work actually finishes.
      setReached((r) => Math.min(r + 1, stages.length - 1));
    }, intervalMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  return (
    <div className="import-progress" role="status" aria-live="polite">
      <div className="import-progress-head">
        <Loader2 size={16} className={done ? "" : "spin"} />
        <span>{done ? doneLabel : activeLabel}</span>
      </div>
      <ol className="import-stages">
        {stages.map((label, i) => {
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
