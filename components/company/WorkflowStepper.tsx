"use client";

import { Check } from "lucide-react";

export type WorkflowStep = {
  id: number;
  label: string;
  hint: string;
};

// Institutional-style progress rail across the top of the workflow. Completed
// steps are clickable so the analyst can jump back and revise an earlier stage.
export default function WorkflowStepper({
  steps,
  current,
  furthest,
  onJump
}: {
  steps: WorkflowStep[];
  current: number;
  furthest: number;
  onJump: (id: number) => void;
}) {
  return (
    <ol className="workflow-stepper">
      {steps.map((step) => {
        const state = step.id < current ? "done" : step.id === current ? "active" : "upcoming";
        const reachable = step.id <= furthest;
        return (
          <li key={step.id} className={`workflow-step workflow-step-${state}`}>
            <button
              type="button"
              className="workflow-step-btn"
              disabled={!reachable}
              onClick={() => reachable && onJump(step.id)}
              aria-current={step.id === current ? "step" : undefined}
            >
              <span className="workflow-step-marker">
                {step.id < current ? <Check size={14} /> : step.id}
              </span>
              <span className="workflow-step-text">
                <span className="workflow-step-label">{step.label}</span>
                <span className="workflow-step-hint">{step.hint}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
