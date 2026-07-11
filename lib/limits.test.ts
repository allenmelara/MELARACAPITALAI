import { describe, expect, it } from "vitest";
import { PLAN_LIMITS } from "./limits";

describe("PLAN_LIMITS", () => {
  it("defines caps for every plan", () => {
    expect(Object.keys(PLAN_LIMITS).sort()).toEqual(["business", "free", "pro"]);
  });

  it("strictly increases the monthly report cap from free to pro", () => {
    expect(PLAN_LIMITS.pro.reportsPerMonth).toBeGreaterThan(PLAN_LIMITS.free.reportsPerMonth);
  });

  it("gives business unlimited reports and saved reports", () => {
    expect(PLAN_LIMITS.business.reportsPerMonth).toBe(Infinity);
    expect(PLAN_LIMITS.business.savedReports).toBe(Infinity);
  });

  it("gives free plan finite, non-zero caps", () => {
    expect(PLAN_LIMITS.free.reportsPerMonth).toBeGreaterThan(0);
    expect(PLAN_LIMITS.free.savedReports).toBeGreaterThan(0);
    expect(Number.isFinite(PLAN_LIMITS.free.reportsPerMonth)).toBe(true);
    expect(Number.isFinite(PLAN_LIMITS.free.savedReports)).toBe(true);
  });
});
