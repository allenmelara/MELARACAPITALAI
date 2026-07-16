import { describe, expect, it } from "vitest";
import { computeLevelInfo, unlocksForLevel, xpForStreakMilestone } from "./xpCalc";

describe("computeLevelInfo", () => {
  it("starts at level 0 with zero XP", () => {
    expect(computeLevelInfo(0)).toEqual({
      level: 0,
      title: "Intern",
      totalXp: 0,
      xpIntoLevel: 0,
      xpForNextLevel: 100
    });
  });

  it("clamps negative XP to zero", () => {
    expect(computeLevelInfo(-50).level).toBe(0);
  });

  it("levels up exactly at a threshold", () => {
    expect(computeLevelInfo(100).level).toBe(1);
    expect(computeLevelInfo(99).level).toBe(0);
  });

  it("reports progress within the current level", () => {
    const info = computeLevelInfo(150);
    expect(info.level).toBe(1);
    expect(info.xpIntoLevel).toBe(50);
    expect(info.xpForNextLevel).toBe(100); // 250 - 150
  });

  it("reaches the max tabled level", () => {
    expect(computeLevelInfo(5000).level).toBe(11);
    expect(computeLevelInfo(5000).title).toBe("Managing Director");
  });

  it("keeps climbing indefinitely past the tabled cap at a fixed rate", () => {
    expect(computeLevelInfo(5000 + 1200).level).toBe(12);
    expect(computeLevelInfo(5000 + 1199).level).toBe(11);
    expect(computeLevelInfo(5000 + 1200 * 5).level).toBe(16);
    // Title stays pinned to the last hand-authored tier beyond the cap.
    expect(computeLevelInfo(50000).title).toBe("Managing Director");
  });
});

describe("xpForStreakMilestone", () => {
  it("returns the tiered amount for known milestones", () => {
    expect(xpForStreakMilestone(3)).toBe(50);
    expect(xpForStreakMilestone(6)).toBe(100);
    expect(xpForStreakMilestone(12)).toBe(200);
  });

  it("returns 0 for a non-milestone month count", () => {
    expect(xpForStreakMilestone(4)).toBe(0);
  });
});

describe("unlocksForLevel", () => {
  it("unlocks nothing at level 0", () => {
    expect(unlocksForLevel(0)).toEqual([]);
  });

  it("accumulates decorations from every level up to and including the current one", () => {
    const level2 = unlocksForLevel(2);
    expect(level2).toContain("monitor");
    expect(level2).toContain("desk-lamp");
    expect(level2).toContain("plant-small");
    expect(level2).toHaveLength(3);
  });

  it("caps decorations at the max tabled level for anything beyond it", () => {
    expect(unlocksForLevel(11)).toEqual(unlocksForLevel(50));
  });
});
