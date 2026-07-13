import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Every financial field here is a coarse range/enum, never an exact figure,
// account number, or credential — this table only ever stores what the user
// is comfortable sharing for personalization, not sensitive account data.

export const AGE_RANGES = ["under_25", "25_34", "35_44", "45_54", "55_64", "65_plus"] as const;
export const INCOME_RANGES = ["under_50k", "50k_100k", "100k_150k", "150k_250k", "250k_plus"] as const;
export const EXPENSES_RANGES = ["under_2k", "2k_4k", "4k_6k", "6k_10k", "10k_plus"] as const;
export const SAVINGS_RANGES = ["under_10k", "10k_50k", "50k_150k", "150k_500k", "500k_plus"] as const;
export const DEBTS_RANGES = ["none", "under_10k", "10k_50k", "50k_150k", "150k_plus"] as const;
export const TIME_HORIZONS = ["short", "medium", "long"] as const;
export const RISK_TOLERANCES = ["conservative", "moderate", "aggressive"] as const;
export const INVESTMENT_EXPERIENCES = ["none", "beginner", "intermediate", "advanced"] as const;

export type AgeRange = (typeof AGE_RANGES)[number];
export type IncomeRange = (typeof INCOME_RANGES)[number];
export type ExpensesRange = (typeof EXPENSES_RANGES)[number];
export type SavingsRange = (typeof SAVINGS_RANGES)[number];
export type DebtsRange = (typeof DEBTS_RANGES)[number];
export type TimeHorizon = (typeof TIME_HORIZONS)[number];
export type RiskTolerance = (typeof RISK_TOLERANCES)[number];
export type InvestmentExperience = (typeof INVESTMENT_EXPERIENCES)[number];

export const CURRENT_CONSENT_VERSION = "v1";

export type FinancialProfile = {
  ageRange: AgeRange | null;
  incomeRange: IncomeRange | null;
  monthlyExpensesRange: ExpensesRange | null;
  savingsRange: SavingsRange | null;
  debtsRange: DebtsRange | null;
  goals: string[];
  emergencyFundGoalMonths: number | null;
  retirementGoalAge: number | null;
  timeHorizon: TimeHorizon | null;
  riskTolerance: RiskTolerance | null;
  investmentExperience: InvestmentExperience | null;
  realEstateInterest: boolean | null;
  businessOwnershipInterest: boolean | null;
  usedEstimatedValues: boolean;
  // Self-reported coverage flags, null = unanswered (not "no coverage") —
  // feeds the Financial Health Score's "insurance readiness" category.
  hasHealthInsurance: boolean | null;
  hasLifeInsurance: boolean | null;
  hasDisabilityInsurance: boolean | null;
  hasHomeOrRentersInsurance: boolean | null;
  consentGivenAt: string | null;
  consentVersion: string | null;
  onboardingCompletedAt: string | null;
  onboardingSkipped: boolean;
  updatedAt: string;
};

// Every field is optional (a question can always be skipped) and nullable (an
// already-answered question can be cleared). Undefined means "leave as-is" on
// upsert; null means "explicitly clear this field".
export const financialProfileInputSchema = z.object({
  ageRange: z.enum(AGE_RANGES).nullable().optional(),
  incomeRange: z.enum(INCOME_RANGES).nullable().optional(),
  monthlyExpensesRange: z.enum(EXPENSES_RANGES).nullable().optional(),
  savingsRange: z.enum(SAVINGS_RANGES).nullable().optional(),
  debtsRange: z.enum(DEBTS_RANGES).nullable().optional(),
  goals: z.array(z.string().trim().max(60)).max(20).optional(),
  emergencyFundGoalMonths: z.number().min(0).max(120).nullable().optional(),
  retirementGoalAge: z.number().int().min(1).max(120).nullable().optional(),
  timeHorizon: z.enum(TIME_HORIZONS).nullable().optional(),
  riskTolerance: z.enum(RISK_TOLERANCES).nullable().optional(),
  investmentExperience: z.enum(INVESTMENT_EXPERIENCES).nullable().optional(),
  realEstateInterest: z.boolean().nullable().optional(),
  businessOwnershipInterest: z.boolean().nullable().optional(),
  usedEstimatedValues: z.boolean().optional(),
  hasHealthInsurance: z.boolean().nullable().optional(),
  hasLifeInsurance: z.boolean().nullable().optional(),
  hasDisabilityInsurance: z.boolean().nullable().optional(),
  hasHomeOrRentersInsurance: z.boolean().nullable().optional(),
  // Flags, not stored fields — true tells the route to stamp the matching
  // timestamp columns with the current time rather than accepting a
  // client-supplied date.
  completeOnboarding: z.boolean().optional(),
  onboardingSkipped: z.boolean().optional(),
  consent: z.boolean().optional()
});

export type FinancialProfileInput = z.infer<typeof financialProfileInputSchema>;

type FinancialProfileRow = {
  age_range: AgeRange | null;
  income_range: IncomeRange | null;
  monthly_expenses_range: ExpensesRange | null;
  savings_range: SavingsRange | null;
  debts_range: DebtsRange | null;
  goals: string[] | null;
  emergency_fund_goal_months: number | string | null;
  retirement_goal_age: number | null;
  time_horizon: TimeHorizon | null;
  risk_tolerance: RiskTolerance | null;
  investment_experience: InvestmentExperience | null;
  real_estate_interest: boolean | null;
  business_ownership_interest: boolean | null;
  used_estimated_values: boolean;
  has_health_insurance: boolean | null;
  has_life_insurance: boolean | null;
  has_disability_insurance: boolean | null;
  has_home_or_renters_insurance: boolean | null;
  consent_given_at: string | null;
  consent_version: string | null;
  onboarding_completed_at: string | null;
  onboarding_skipped: boolean;
  updated_at: string;
};

const COLUMNS =
  "age_range, income_range, monthly_expenses_range, savings_range, debts_range, goals, " +
  "emergency_fund_goal_months, retirement_goal_age, time_horizon, risk_tolerance, investment_experience, " +
  "real_estate_interest, business_ownership_interest, used_estimated_values, has_health_insurance, " +
  "has_life_insurance, has_disability_insurance, has_home_or_renters_insurance, consent_given_at, " +
  "consent_version, onboarding_completed_at, onboarding_skipped, updated_at";

function toProfile(row: FinancialProfileRow): FinancialProfile {
  return {
    ageRange: row.age_range,
    incomeRange: row.income_range,
    monthlyExpensesRange: row.monthly_expenses_range,
    savingsRange: row.savings_range,
    debtsRange: row.debts_range,
    goals: row.goals ?? [],
    emergencyFundGoalMonths:
      row.emergency_fund_goal_months !== null ? Number(row.emergency_fund_goal_months) : null,
    retirementGoalAge: row.retirement_goal_age,
    timeHorizon: row.time_horizon,
    riskTolerance: row.risk_tolerance,
    investmentExperience: row.investment_experience,
    realEstateInterest: row.real_estate_interest,
    businessOwnershipInterest: row.business_ownership_interest,
    usedEstimatedValues: row.used_estimated_values,
    hasHealthInsurance: row.has_health_insurance,
    hasLifeInsurance: row.has_life_insurance,
    hasDisabilityInsurance: row.has_disability_insurance,
    hasHomeOrRentersInsurance: row.has_home_or_renters_insurance,
    consentGivenAt: row.consent_given_at,
    consentVersion: row.consent_version,
    onboardingCompletedAt: row.onboarding_completed_at,
    onboardingSkipped: row.onboarding_skipped,
    updatedAt: row.updated_at
  };
}

export async function getFinancialProfile(): Promise<FinancialProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("financial_profiles").select(COLUMNS).maybeSingle();
  if (error) throw error;
  return data ? toProfile(data as unknown as FinancialProfileRow) : null;
}

export async function upsertFinancialProfile(
  userId: string,
  input: FinancialProfileInput
): Promise<FinancialProfile> {
  const supabase = await createClient();

  const row: Record<string, unknown> = {
    user_id: userId,
    age_range: input.ageRange,
    income_range: input.incomeRange,
    monthly_expenses_range: input.monthlyExpensesRange,
    savings_range: input.savingsRange,
    debts_range: input.debtsRange,
    goals: input.goals,
    emergency_fund_goal_months: input.emergencyFundGoalMonths,
    retirement_goal_age: input.retirementGoalAge,
    time_horizon: input.timeHorizon,
    risk_tolerance: input.riskTolerance,
    investment_experience: input.investmentExperience,
    real_estate_interest: input.realEstateInterest,
    business_ownership_interest: input.businessOwnershipInterest,
    used_estimated_values: input.usedEstimatedValues,
    has_health_insurance: input.hasHealthInsurance,
    has_life_insurance: input.hasLifeInsurance,
    has_disability_insurance: input.hasDisabilityInsurance,
    has_home_or_renters_insurance: input.hasHomeOrRentersInsurance,
    onboarding_skipped: input.onboardingSkipped,
    updated_at: new Date().toISOString()
  };

  if (input.completeOnboarding) {
    row.onboarding_completed_at = new Date().toISOString();
  }
  if (input.consent) {
    row.consent_given_at = new Date().toISOString();
    row.consent_version = CURRENT_CONSENT_VERSION;
  }

  // Keys set to `undefined` above are dropped by JSON.stringify before the
  // request body is sent, so an unanswered/skipped question leaves the
  // existing stored value untouched rather than overwriting it with null.
  const { data, error } = await supabase
    .from("financial_profiles")
    .upsert(row, { onConflict: "user_id" })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toProfile(data as unknown as FinancialProfileRow);
}

export async function deleteFinancialProfile(userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("financial_profiles").delete().eq("user_id", userId);
  if (error) throw error;
}
