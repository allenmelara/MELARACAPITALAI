"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import WorkflowStepper, { type WorkflowStep } from "@/components/company/WorkflowStepper";
import type { FinancialProfile, FinancialProfileInput } from "@/lib/financialProfile";

const STEPS: WorkflowStep[] = [
  { id: 1, label: "Basics", hint: "Age & income" },
  { id: 2, label: "Cash flow", hint: "Expenses, savings, debts" },
  { id: 3, label: "Goals & horizon", hint: "What you're working toward" },
  { id: 4, label: "Risk & interests", hint: "Comfort with risk" },
  { id: 5, label: "Review", hint: "Confirm & save" }
];

const GOAL_OPTIONS = [
  "Build an emergency fund",
  "Pay off debt",
  "Save for a home",
  "Save for retirement",
  "Grow my investments",
  "Start or grow a business",
  "Save for education",
  "General wealth building"
];

type Answers = {
  ageRange: string;
  incomeRange: string;
  monthlyExpensesRange: string;
  savingsRange: string;
  debtsRange: string;
  goals: string[];
  emergencyFundGoalMonths: string;
  retirementGoalAge: string;
  timeHorizon: string;
  riskTolerance: string;
  investmentExperience: string;
  realEstateInterest: boolean | null;
  businessOwnershipInterest: boolean | null;
  usedEstimatedValues: boolean;
};

type UpdateFn = <K extends keyof Answers>(key: K, value: Answers[K]) => void;

const EMPTY_ANSWERS: Answers = {
  ageRange: "",
  incomeRange: "",
  monthlyExpensesRange: "",
  savingsRange: "",
  debtsRange: "",
  goals: [],
  emergencyFundGoalMonths: "",
  retirementGoalAge: "",
  timeHorizon: "",
  riskTolerance: "",
  investmentExperience: "",
  realEstateInterest: null,
  businessOwnershipInterest: null,
  usedEstimatedValues: false
};

const DEMO_ANSWERS: Answers = {
  ageRange: "35_44",
  incomeRange: "100k_150k",
  monthlyExpensesRange: "4k_6k",
  savingsRange: "50k_150k",
  debtsRange: "10k_50k",
  goals: ["Save for retirement", "Grow my investments", "Build an emergency fund"],
  emergencyFundGoalMonths: "6",
  retirementGoalAge: "65",
  timeHorizon: "long",
  riskTolerance: "moderate",
  investmentExperience: "intermediate",
  realEstateInterest: true,
  businessOwnershipInterest: false,
  usedEstimatedValues: true
};

function profileToAnswers(profile: FinancialProfile | null): Answers {
  if (!profile) return EMPTY_ANSWERS;
  return {
    ageRange: profile.ageRange ?? "",
    incomeRange: profile.incomeRange ?? "",
    monthlyExpensesRange: profile.monthlyExpensesRange ?? "",
    savingsRange: profile.savingsRange ?? "",
    debtsRange: profile.debtsRange ?? "",
    goals: profile.goals ?? [],
    emergencyFundGoalMonths:
      profile.emergencyFundGoalMonths !== null ? String(profile.emergencyFundGoalMonths) : "",
    retirementGoalAge: profile.retirementGoalAge !== null ? String(profile.retirementGoalAge) : "",
    timeHorizon: profile.timeHorizon ?? "",
    riskTolerance: profile.riskTolerance ?? "",
    investmentExperience: profile.investmentExperience ?? "",
    realEstateInterest: profile.realEstateInterest,
    businessOwnershipInterest: profile.businessOwnershipInterest,
    usedEstimatedValues: profile.usedEstimatedValues
  };
}

// Clamps a numeric text-input value into [min, max] on blur — the HTML max
// attribute alone doesn't stop someone from typing past it, so without this
// an out-of-range value silently survives every wizard step and only
// surfaces as a generic Zod error on the final "Save & finish" click.
function clampNumberString(value: string, min: number, max: number): string {
  if (value === "") return value;
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return String(Math.min(max, Math.max(min, num)));
}

function buildPayload(answers: Answers, opts: { complete?: boolean; consent?: boolean }): FinancialProfileInput {
  const payload: FinancialProfileInput = { usedEstimatedValues: answers.usedEstimatedValues };
  if (answers.ageRange) payload.ageRange = answers.ageRange as FinancialProfileInput["ageRange"];
  if (answers.incomeRange) payload.incomeRange = answers.incomeRange as FinancialProfileInput["incomeRange"];
  if (answers.monthlyExpensesRange)
    payload.monthlyExpensesRange = answers.monthlyExpensesRange as FinancialProfileInput["monthlyExpensesRange"];
  if (answers.savingsRange) payload.savingsRange = answers.savingsRange as FinancialProfileInput["savingsRange"];
  if (answers.debtsRange) payload.debtsRange = answers.debtsRange as FinancialProfileInput["debtsRange"];
  if (answers.goals.length) payload.goals = answers.goals;
  if (answers.emergencyFundGoalMonths !== "") payload.emergencyFundGoalMonths = Number(answers.emergencyFundGoalMonths);
  if (answers.retirementGoalAge !== "") payload.retirementGoalAge = Number(answers.retirementGoalAge);
  if (answers.timeHorizon) payload.timeHorizon = answers.timeHorizon as FinancialProfileInput["timeHorizon"];
  if (answers.riskTolerance) payload.riskTolerance = answers.riskTolerance as FinancialProfileInput["riskTolerance"];
  if (answers.investmentExperience)
    payload.investmentExperience = answers.investmentExperience as FinancialProfileInput["investmentExperience"];
  if (answers.realEstateInterest !== null) payload.realEstateInterest = answers.realEstateInterest;
  if (answers.businessOwnershipInterest !== null) payload.businessOwnershipInterest = answers.businessOwnershipInterest;
  if (opts.complete) payload.completeOnboarding = true;
  if (opts.consent) payload.consent = true;
  return payload;
}

export default function OnboardingWizard({ initialProfile }: { initialProfile: FinancialProfile | null }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [furthest, setFurthest] = useState(1);
  const [answers, setAnswers] = useState<Answers>(() => profileToAnswers(initialProfile));
  const [demoMode, setDemoMode] = useState(false);
  const [consentInfo, setConsentInfo] = useState(false);
  const [consentStorage, setConsentStorage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const alreadyCompleted = Boolean(initialProfile?.onboardingCompletedAt);

  function goTo(target: number) {
    setStep(target);
    setFurthest((current) => Math.max(current, target));
  }

  function update<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function toggleGoal(goal: string) {
    setAnswers((current) => ({
      ...current,
      goals: current.goals.includes(goal) ? current.goals.filter((g) => g !== goal) : [...current.goals, goal]
    }));
  }

  function startDemo() {
    setDemoMode(true);
    setAnswers(DEMO_ANSWERS);
    goTo(1);
  }

  function exitDemo() {
    router.push("/dashboard");
  }

  async function skipForNow() {
    setSaving(true);
    setError("");
    try {
      await fetch("/api/financial-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingSkipped: true })
      });
    } finally {
      router.push("/dashboard");
    }
  }

  async function saveAndFinish() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/financial-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(answers, { complete: true, consent: true }))
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save your financial profile.");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save your financial profile.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = demoMode || (consentInfo && consentStorage);

  return (
    <div className="workflow">
      <div className="workflow-head">
        <div>
          <h1 className="workflow-title">Personal Financial Profile</h1>
          <p className="workflow-sub">
            A quick, optional questionnaire so Melara can personalize your dashboard. Every question is
            optional — skip anything you'd rather not answer.
          </p>
        </div>
        <button className="secondary workflow-reset" onClick={skipForNow} disabled={saving}>
          Skip for now
        </button>
      </div>

      <WorkflowStepper steps={STEPS} current={step} furthest={furthest} onJump={goTo} />

      <div className="panel workflow-stage">
        {demoMode && (
          <div className="notice onboarding-demo-banner">
            Demo mode — this is sample data and nothing you see here is saved.
          </div>
        )}

        {step === 1 && !demoMode && !alreadyCompleted && (
          <button type="button" className="secondary onboarding-demo-btn" onClick={startDemo}>
            <Sparkles size={15} /> See it with example data instead
          </button>
        )}

        {step === 1 && (
          <StepBasics answers={answers} onUpdate={update} />
        )}
        {step === 2 && <StepCashFlow answers={answers} onUpdate={update} />}
        {step === 3 && <StepGoals answers={answers} onUpdate={update} onToggleGoal={toggleGoal} />}
        {step === 4 && <StepRisk answers={answers} onUpdate={update} />}
        {step === 5 && (
          <StepReview
            answers={answers}
            demoMode={demoMode}
            consentInfo={consentInfo}
            consentStorage={consentStorage}
            onConsentInfo={setConsentInfo}
            onConsentStorage={setConsentStorage}
          />
        )}

        {error && <div className="error">{error}</div>}

        <div className="workflow-nav">
          {step > 1 ? (
            <button className="secondary" onClick={() => goTo(step - 1)} disabled={saving}>
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <span />
          )}
          {step < 5 ? (
            <button className="primary" onClick={() => goTo(step + 1)} disabled={saving}>
              Continue <ArrowRight size={16} />
            </button>
          ) : demoMode ? (
            <button className="primary" onClick={exitDemo}>
              Exit demo
            </button>
          ) : (
            <button className="primary" onClick={saveAndFinish} disabled={saving || !canSave}>
              <ShieldCheck size={16} /> {saving ? "Saving..." : "Save & finish"}
            </button>
          )}
        </div>
      </div>

      <p className="disclaimer">
        Melara Capital AI is not a bank, broker, or registered investment adviser. Nothing here is
        personalized investment, legal, or tax advice — it's used only to tailor educational content
        to your situation.
      </p>
    </div>
  );
}

function StepBasics({ answers, onUpdate }: { answers: Answers; onUpdate: UpdateFn }) {
  return (
    <div>
      <h2>The basics</h2>
      <p className="onboarding-why">
        Why we ask: age and income range help us calibrate time horizons and give context-appropriate
        examples — we never ask for exact income or account numbers.
      </p>
      <div className="form-grid">
        <label>
          Age range
          <select value={answers.ageRange} onChange={(e) => onUpdate("ageRange", e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="under_25">Under 25</option>
            <option value="25_34">25–34</option>
            <option value="35_44">35–44</option>
            <option value="45_54">45–54</option>
            <option value="55_64">55–64</option>
            <option value="65_plus">65+</option>
          </select>
        </label>
        <label>
          Annual household income
          <select value={answers.incomeRange} onChange={(e) => onUpdate("incomeRange", e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="under_50k">Under $50k</option>
            <option value="50k_100k">$50k–$100k</option>
            <option value="100k_150k">$100k–$150k</option>
            <option value="150k_250k">$150k–$250k</option>
            <option value="250k_plus">$250k+</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function StepCashFlow({ answers, onUpdate }: { answers: Answers; onUpdate: UpdateFn }) {
  return (
    <div>
      <h2>Cash flow</h2>
      <p className="onboarding-why">
        Why we ask: rough expense, savings, and debt ranges help us flag when you might be over- or
        under-saving relative to where you are today.
      </p>
      <div className="form-grid">
        <label>
          Monthly expenses
          <select
            value={answers.monthlyExpensesRange}
            onChange={(e) => onUpdate("monthlyExpensesRange", e.target.value)}
          >
            <option value="">Prefer not to say</option>
            <option value="under_2k">Under $2k</option>
            <option value="2k_4k">$2k–$4k</option>
            <option value="4k_6k">$4k–$6k</option>
            <option value="6k_10k">$6k–$10k</option>
            <option value="10k_plus">$10k+</option>
          </select>
        </label>
        <label>
          Total savings & investments
          <select value={answers.savingsRange} onChange={(e) => onUpdate("savingsRange", e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="under_10k">Under $10k</option>
            <option value="10k_50k">$10k–$50k</option>
            <option value="50k_150k">$50k–$150k</option>
            <option value="150k_500k">$150k–$500k</option>
            <option value="500k_plus">$500k+</option>
          </select>
        </label>
        <label>
          Total debts (excluding mortgage)
          <select value={answers.debtsRange} onChange={(e) => onUpdate("debtsRange", e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="none">None</option>
            <option value="under_10k">Under $10k</option>
            <option value="10k_50k">$10k–$50k</option>
            <option value="50k_150k">$50k–$150k</option>
            <option value="150k_plus">$150k+</option>
          </select>
        </label>
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={answers.usedEstimatedValues}
          onChange={(e) => onUpdate("usedEstimatedValues", e.target.checked)}
        />
        These are ballpark estimates, not exact figures
      </label>
    </div>
  );
}

function StepGoals({
  answers,
  onUpdate,
  onToggleGoal
}: {
  answers: Answers;
  onUpdate: UpdateFn;
  onToggleGoal: (goal: string) => void;
}) {
  return (
    <div>
      <h2>Goals & horizon</h2>
      <p className="onboarding-why">
        Why we ask: knowing what you're working toward and your time horizon helps prioritize which
        insights to surface first.
      </p>
      <div className="onboarding-chip-grid">
        {GOAL_OPTIONS.map((goal) => (
          <label key={goal} className="checkbox-row">
            <input type="checkbox" checked={answers.goals.includes(goal)} onChange={() => onToggleGoal(goal)} />
            {goal}
          </label>
        ))}
      </div>
      <div className="form-grid" style={{ marginTop: 16 }}>
        <label>
          Emergency fund goal (months of expenses)
          <input
            type="number"
            min="0"
            max="120"
            value={answers.emergencyFundGoalMonths}
            onChange={(e) => onUpdate("emergencyFundGoalMonths", e.target.value)}
            onBlur={(e) => onUpdate("emergencyFundGoalMonths", clampNumberString(e.target.value, 0, 120))}
          />
        </label>
        <label>
          Target retirement age
          <input
            type="number"
            min="1"
            max="120"
            value={answers.retirementGoalAge}
            onChange={(e) => onUpdate("retirementGoalAge", e.target.value)}
            onBlur={(e) => onUpdate("retirementGoalAge", clampNumberString(e.target.value, 1, 120))}
          />
        </label>
        <label>
          Time horizon for your main goal
          <select value={answers.timeHorizon} onChange={(e) => onUpdate("timeHorizon", e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="short">Short-term (under 3 years)</option>
            <option value="medium">Medium-term (3–10 years)</option>
            <option value="long">Long-term (10+ years)</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function StepRisk({ answers, onUpdate }: { answers: Answers; onUpdate: UpdateFn }) {
  return (
    <div>
      <h2>Risk & interests</h2>
      <p className="onboarding-why">
        Why we ask: risk comfort and experience shape how cautious or ambitious our educational examples
        should be. Real estate and business interest just help us surface the right modules.
      </p>
      <div className="form-grid">
        <label>
          Risk tolerance
          <select value={answers.riskTolerance} onChange={(e) => onUpdate("riskTolerance", e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </label>
        <label>
          Investment experience
          <select
            value={answers.investmentExperience}
            onChange={(e) => onUpdate("investmentExperience", e.target.value)}
          >
            <option value="">Prefer not to say</option>
            <option value="none">None yet</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={answers.realEstateInterest === true}
          onChange={(e) => onUpdate("realEstateInterest", e.target.checked ? true : null)}
        />
        I'm interested in real estate investing
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={answers.businessOwnershipInterest === true}
          onChange={(e) => onUpdate("businessOwnershipInterest", e.target.checked ? true : null)}
        />
        I'm interested in starting or growing a business
      </label>
    </div>
  );
}

function StepReview({
  answers,
  demoMode,
  consentInfo,
  consentStorage,
  onConsentInfo,
  onConsentStorage
}: {
  answers: Answers;
  demoMode: boolean;
  consentInfo: boolean;
  consentStorage: boolean;
  onConsentInfo: (v: boolean) => void;
  onConsentStorage: (v: boolean) => void;
}) {
  const summaryItems = [
    ["Age range", answers.ageRange],
    ["Income range", answers.incomeRange],
    ["Monthly expenses", answers.monthlyExpensesRange],
    ["Savings", answers.savingsRange],
    ["Debts", answers.debtsRange],
    ["Goals", answers.goals.join(", ")],
    ["Emergency fund goal", answers.emergencyFundGoalMonths && `${answers.emergencyFundGoalMonths} months`],
    ["Retirement age goal", answers.retirementGoalAge],
    ["Time horizon", answers.timeHorizon],
    ["Risk tolerance", answers.riskTolerance],
    ["Investment experience", answers.investmentExperience]
  ].filter(([, value]) => Boolean(value));

  return (
    <div>
      <h2>Review & {demoMode ? "explore" : "consent"}</h2>
      {summaryItems.length === 0 ? (
        <p className="disclaimer">You skipped every question — that's okay, you can fill this in anytime.</p>
      ) : (
        <ul className="onboarding-summary">
          {summaryItems.map(([label, value]) => (
            <li key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </li>
          ))}
        </ul>
      )}

      {!demoMode && (
        <div className="onboarding-consent">
          <label className="checkbox-row">
            <input type="checkbox" checked={consentInfo} onChange={(e) => onConsentInfo(e.target.checked)} />
            I understand this information is used to personalize educational insights and is not
            financial, legal, or tax advice.
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={consentStorage} onChange={(e) => onConsentStorage(e.target.checked)} />
            I consent to Melara storing the financial details I've provided.
          </label>
        </div>
      )}
    </div>
  );
}
