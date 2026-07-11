"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { CompanyInputs, TerminalMethod } from "@/lib/finance";
import type { FieldSource } from "@/components/company/SourceBadge";
import SourceBadge from "@/components/company/SourceBadge";

// Step 3's assumption inputs, tucked behind a single collapsible section so
// the default valuation view stays a verdict + metrics, not a form. Nothing
// here is required — every field has a sensible default already reflected
// in the metrics shown above.
export default function AdvancedSettings({
  inputs,
  sourceNotes,
  onUpdate,
  onTerminalMethodChange,
  marginOverrideEnabled,
  onToggleMarginOverride,
  todaysMargin
}: {
  inputs: CompanyInputs;
  sourceNotes: Record<string, FieldSource>;
  onUpdate: (key: keyof CompanyInputs, raw: string) => void;
  onTerminalMethodChange: (method: TerminalMethod) => void;
  marginOverrideEnabled: boolean;
  onToggleMarginOverride: (enabled: boolean) => void;
  todaysMargin: number;
}) {
  const terminalMethod: TerminalMethod = inputs.terminalMethod ?? "growth";

  return (
    <details className="advanced-settings">
      <summary className="advanced-settings-summary">
        <ChevronDown size={16} className="statement-chevron" />
        <SlidersHorizontal size={15} />
        <span>Advanced settings</span>
        <span className="advanced-settings-hint">Discount rate, terminal value, projection period &amp; more</span>
      </summary>

      <div className="advanced-settings-body">
        <div className="advanced-group">
          <h4 className="advanced-group-title">Growth &amp; rates</h4>
          <div className="form-grid">
            <label>
              <span className="field-label">
                Revenue growth rate
                <SourceBadge status={sourceNotes.growthRate} />
              </span>
              <input
                type="number"
                step="0.001"
                value={inputs.growthRate}
                onChange={(e) => onUpdate("growthRate", e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">Discount rate (WACC)</span>
              <input
                type="number"
                step="0.001"
                value={inputs.discountRate}
                onChange={(e) => onUpdate("discountRate", e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">
                Tax rate
                <SourceBadge status={sourceNotes.taxRate} />
              </span>
              <input
                type="number"
                step="0.001"
                value={inputs.taxRate}
                onChange={(e) => onUpdate("taxRate", e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">Projection period (years)</span>
              <input
                type="number"
                step="1"
                min="1"
                max="10"
                value={inputs.projectionYears ?? 5}
                onChange={(e) => onUpdate("projectionYears", e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="advanced-group">
          <h4 className="advanced-group-title">Terminal value</h4>
          <div className="terminal-method-toggle" role="radiogroup" aria-label="Terminal value method">
            <button
              type="button"
              role="radio"
              aria-checked={terminalMethod === "growth"}
              className={`terminal-method-option ${terminalMethod === "growth" ? "active" : ""}`}
              onClick={() => onTerminalMethodChange("growth")}
            >
              Perpetuity growth
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={terminalMethod === "exitMultiple"}
              className={`terminal-method-option ${terminalMethod === "exitMultiple" ? "active" : ""}`}
              onClick={() => onTerminalMethodChange("exitMultiple")}
            >
              Exit multiple
            </button>
          </div>
          <div className="form-grid">
            {terminalMethod === "growth" ? (
              <label>
                <span className="field-label">Terminal growth rate</span>
                <input
                  type="number"
                  step="0.001"
                  value={inputs.terminalGrowthRate}
                  onChange={(e) => onUpdate("terminalGrowthRate", e.target.value)}
                />
              </label>
            ) : (
              <label>
                <span className="field-label">Exit multiple (EV / EBITDA)</span>
                <input
                  type="number"
                  step="0.5"
                  value={inputs.exitMultiple ?? 8}
                  onChange={(e) => onUpdate("exitMultiple", e.target.value)}
                />
              </label>
            )}
          </div>
        </div>

        <div className="advanced-group">
          <h4 className="advanced-group-title">Margin &amp; cash-flow assumptions</h4>
          <label className="margin-override-toggle">
            <input
              type="checkbox"
              checked={marginOverrideEnabled}
              onChange={(e) => onToggleMarginOverride(e.target.checked)}
            />
            Override projected EBITDA margin (today&apos;s: {(todaysMargin * 100).toFixed(1)}%)
          </label>
          <div className="form-grid">
            {marginOverrideEnabled && (
              <label>
                <span className="field-label">Projected EBITDA margin</span>
                <input
                  type="number"
                  step="0.001"
                  value={inputs.ebitdaMarginOverride ?? todaysMargin}
                  onChange={(e) => onUpdate("ebitdaMarginOverride", e.target.value)}
                />
              </label>
            )}
            <label>
              <span className="field-label">
                D&amp;A (% of revenue)
                <SourceBadge status={sourceNotes.depreciationPct} />
              </span>
              <input
                type="number"
                step="0.001"
                value={inputs.depreciationPct}
                onChange={(e) => onUpdate("depreciationPct", e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">
                Capex (% of revenue)
                <SourceBadge status={sourceNotes.capexPct} />
              </span>
              <input
                type="number"
                step="0.001"
                value={inputs.capexPct}
                onChange={(e) => onUpdate("capexPct", e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">
                Δ Net working capital (% of revenue)
                <SourceBadge status={sourceNotes.nwcChangePct} />
              </span>
              <input
                type="number"
                step="0.001"
                value={inputs.nwcChangePct}
                onChange={(e) => onUpdate("nwcChangePct", e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>
    </details>
  );
}
