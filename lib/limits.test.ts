import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, documentCharLimit, CHARS_PER_PAGE } from "./limits";

describe("PLAN_LIMITS", () => {
  it("defines caps for every plan", () => {
    expect(Object.keys(PLAN_LIMITS).sort()).toEqual(["business", "free", "pro"]);
  });

  it("strictly increases AI Research Credits from free to pro", () => {
    expect(PLAN_LIMITS.pro.aiResearchCredits).toBeGreaterThan(PLAN_LIMITS.free.aiResearchCredits);
  });

  it("gives business unlimited AI Research Credits", () => {
    expect(PLAN_LIMITS.business.aiResearchCredits).toBe(Infinity);
  });

  it("gives every plan unlimited saved reports", () => {
    expect(PLAN_LIMITS.free.savedReports).toBe(Infinity);
    expect(PLAN_LIMITS.pro.savedReports).toBe(Infinity);
    expect(PLAN_LIMITS.business.savedReports).toBe(Infinity);
  });

  it("gives free plan finite, non-zero caps on the metered AI resources", () => {
    expect(PLAN_LIMITS.free.aiResearchCredits).toBeGreaterThan(0);
    expect(PLAN_LIMITS.free.chatMessagesPerMonth).toBeGreaterThan(0);
    expect(PLAN_LIMITS.free.documentUploadsPerMonth).toBeGreaterThan(0);
    expect(Number.isFinite(PLAN_LIMITS.free.aiResearchCredits)).toBe(true);
    expect(Number.isFinite(PLAN_LIMITS.free.chatMessagesPerMonth)).toBe(true);
    expect(Number.isFinite(PLAN_LIMITS.free.documentUploadsPerMonth)).toBe(true);
  });

  it("gives pro and business effectively unlimited chat and document uploads", () => {
    expect(PLAN_LIMITS.pro.chatMessagesPerMonth).toBe(Infinity);
    expect(PLAN_LIMITS.pro.documentUploadsPerMonth).toBe(Infinity);
    expect(PLAN_LIMITS.business.chatMessagesPerMonth).toBe(Infinity);
    expect(PLAN_LIMITS.business.documentUploadsPerMonth).toBe(Infinity);
  });

  it("strictly increases the document page cap from free to pro", () => {
    expect(PLAN_LIMITS.pro.documentMaxPages).toBeGreaterThan(PLAN_LIMITS.free.documentMaxPages);
  });
});

describe("documentCharLimit", () => {
  it("converts a plan's page cap into a character cap using the page heuristic", () => {
    expect(documentCharLimit("free")).toBe(PLAN_LIMITS.free.documentMaxPages * CHARS_PER_PAGE);
  });

  it("returns Infinity for a plan with an unlimited page cap", () => {
    expect(documentCharLimit("business")).toBe(Infinity);
  });
});
