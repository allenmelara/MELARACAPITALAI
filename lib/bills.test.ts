import { describe, expect, it } from "vitest";
import { withNextDueDate, type Bill } from "./bills";

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "1",
    name: "Test bill",
    amount: 100,
    dueDay: 15,
    category: null,
    autopay: false,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("withNextDueDate", () => {
  it("uses this month's occurrence when the due day hasn't passed yet", () => {
    const today = new Date(2026, 6, 10); // July 10, 2026
    const [result] = withNextDueDate([makeBill({ dueDay: 15 })], today);
    expect(result.nextDueDate).toBe("2026-07-15");
  });

  it("rolls over to next month once the due day has passed", () => {
    const today = new Date(2026, 6, 20); // July 20, 2026
    const [result] = withNextDueDate([makeBill({ dueDay: 15 })], today);
    expect(result.nextDueDate).toBe("2026-08-15");
  });

  it("clamps a due day beyond the month's length", () => {
    const today = new Date(2026, 1, 1); // Feb 1, 2026 (28 days)
    const [result] = withNextDueDate([makeBill({ dueDay: 31 })], today);
    expect(result.nextDueDate).toBe("2026-02-28");
  });

  it("sorts multiple bills by next due date ascending", () => {
    const today = new Date(2026, 6, 10);
    const results = withNextDueDate([makeBill({ id: "a", dueDay: 25 }), makeBill({ id: "b", dueDay: 12 })], today);
    expect(results.map((r) => r.id)).toEqual(["b", "a"]);
  });
});
