import { describe, expect, it } from "vitest";
import { financialProfileInputSchema, CURRENT_CONSENT_VERSION } from "./financialProfile";

describe("financialProfileInputSchema", () => {
  it("accepts an empty object — every question is skippable", () => {
    const result = financialProfileInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a fully answered, valid profile", () => {
    const result = financialProfileInputSchema.safeParse({
      ageRange: "35_44",
      incomeRange: "100k_150k",
      monthlyExpensesRange: "4k_6k",
      savingsRange: "50k_150k",
      debtsRange: "10k_50k",
      goals: ["Save for retirement", "Build an emergency fund"],
      emergencyFundGoalMonths: 6,
      retirementGoalAge: 65,
      timeHorizon: "long",
      riskTolerance: "moderate",
      investmentExperience: "intermediate",
      realEstateInterest: true,
      businessOwnershipInterest: false,
      usedEstimatedValues: true,
      completeOnboarding: true,
      consent: true
    });
    expect(result.success).toBe(true);
  });

  it("accepts explicit nulls to clear a previously answered field", () => {
    const result = financialProfileInputSchema.safeParse({ ageRange: null, retirementGoalAge: null });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid enum value", () => {
    const result = financialProfileInputSchema.safeParse({ ageRange: "not_a_range" });
    expect(result.success).toBe(false);
  });

  it("rejects a retirement goal age outside the valid range", () => {
    const result = financialProfileInputSchema.safeParse({ retirementGoalAge: 500 });
    expect(result.success).toBe(false);
  });

  it("rejects a negative emergency fund goal", () => {
    const result = financialProfileInputSchema.safeParse({ emergencyFundGoalMonths: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects a goals array with more than 20 entries", () => {
    const result = financialProfileInputSchema.safeParse({ goals: Array.from({ length: 21 }, (_, i) => `goal ${i}`) });
    expect(result.success).toBe(false);
  });
});

describe("CURRENT_CONSENT_VERSION", () => {
  it("is a non-empty version string", () => {
    expect(CURRENT_CONSENT_VERSION.length).toBeGreaterThan(0);
  });
});
