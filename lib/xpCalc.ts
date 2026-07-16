// Pure, dependency-free (no supabase/server import) — see lib/xp.ts for the
// read-only CRUD half and lib/xpAwarding.ts for the service-role write half.
//
// XP is append-only (see supabase/schema.sql's xp_events table): a level
// never regresses even if the financial signal that earned it later dips,
// so the level curve only needs to define "how much total XP for level N,"
// never a way to subtract. Beyond the hand-authored level table, XP keeps
// climbing at a fixed rate so a power user's numbers never stop moving —
// the level 11 scene is just reused unchanged for level 12+.

export type XpEventType =
  | "score_increase"
  | "category_mastered"
  | "streak_milestone"
  | "goal_milestone"
  | "net_worth_increase"
  | "budget_logged";

type LevelTier = { level: number; title: string; threshold: number };

const LEVEL_TIERS: LevelTier[] = [
  { level: 0, title: "Intern", threshold: 0 },
  { level: 1, title: "Analyst", threshold: 100 },
  { level: 2, title: "Associate", threshold: 250 },
  { level: 3, title: "Senior Associate", threshold: 450 },
  { level: 4, title: "VP", threshold: 700 },
  { level: 5, title: "Senior VP", threshold: 1000 },
  { level: 6, title: "Director", threshold: 1400 },
  { level: 7, title: "Senior Director", threshold: 1900 },
  { level: 8, title: "Principal", threshold: 2500 },
  { level: 9, title: "Partner", threshold: 3200 },
  { level: 10, title: "Senior Partner", threshold: 4000 },
  { level: 11, title: "Managing Director", threshold: 5000 }
];

const MAX_TABLED_LEVEL = LEVEL_TIERS[LEVEL_TIERS.length - 1].level;
const XP_PER_LEVEL_BEYOND_CAP = 1200;

function thresholdForLevel(level: number): number {
  if (level <= MAX_TABLED_LEVEL) return LEVEL_TIERS[level].threshold;
  return LEVEL_TIERS[MAX_TABLED_LEVEL].threshold + (level - MAX_TABLED_LEVEL) * XP_PER_LEVEL_BEYOND_CAP;
}

function titleForLevel(level: number): string {
  return level <= MAX_TABLED_LEVEL ? LEVEL_TIERS[level].title : LEVEL_TIERS[MAX_TABLED_LEVEL].title;
}

export type LevelInfo = {
  level: number;
  title: string;
  totalXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
};

export function computeLevelInfo(totalXp: number): LevelInfo {
  const safeXp = Math.max(0, totalXp);

  let level = 0;
  for (const tier of LEVEL_TIERS) {
    if (safeXp >= tier.threshold) level = tier.level;
    else break;
  }
  if (level === MAX_TABLED_LEVEL) {
    const beyond = safeXp - LEVEL_TIERS[MAX_TABLED_LEVEL].threshold;
    if (beyond > 0) level = MAX_TABLED_LEVEL + Math.floor(beyond / XP_PER_LEVEL_BEYOND_CAP);
  }

  return {
    level,
    title: titleForLevel(level),
    totalXp: safeXp,
    xpIntoLevel: safeXp - thresholdForLevel(level),
    xpForNextLevel: thresholdForLevel(level + 1) - safeXp
  };
}

// XP amounts per verified event — all deliberately small, flat numbers
// (never scaled to dollar amounts) so the ledger stays a simple "this
// verified thing happened" record, not a second financial calculation that
// could drift from the real one.
export const XP_AMOUNTS = {
  scoreIncrease: 30,
  categoryMastered: 75,
  goalMilestone: 150,
  netWorthIncrease: 10,
  budgetLogged: 20,
  streakMilestone: { 3: 50, 6: 100, 12: 200 } as Record<number, number>
};

export function xpForStreakMilestone(months: number): number {
  return XP_AMOUNTS.streakMilestone[months] ?? 0;
}

export type DecorationId =
  | "monitor"
  | "desk-lamp"
  | "plant-small"
  | "office-chair"
  | "nameplate"
  | "wall-chart"
  | "blazer"
  | "skyline-window"
  | "cabinet-upgrade"
  | "trophy-1"
  | "second-monitor"
  | "plant-large"
  | "rug"
  | "blazer-upgrade"
  | "second-window"
  | "trophy-3"
  | "gold-nameplate"
  | "corner-office";

const DECORATIONS_BY_LEVEL: Record<number, DecorationId[]> = {
  1: ["monitor"],
  2: ["desk-lamp", "plant-small"],
  3: ["office-chair", "nameplate"],
  4: ["wall-chart", "blazer"],
  5: ["skyline-window"],
  6: ["cabinet-upgrade", "trophy-1"],
  7: ["second-monitor"],
  8: ["plant-large", "rug", "blazer-upgrade"],
  9: ["second-window"],
  10: ["trophy-3", "gold-nameplate"],
  11: ["corner-office"]
};

// Cumulative — everything unlocked at or below the current level, not just
// the latest tier's additions, since the scene renders the whole office at
// once.
export function unlocksForLevel(level: number): DecorationId[] {
  const cappedLevel = Math.min(Math.max(0, level), MAX_TABLED_LEVEL);
  const unlocked: DecorationId[] = [];
  for (let l = 1; l <= cappedLevel; l++) {
    unlocked.push(...(DECORATIONS_BY_LEVEL[l] ?? []));
  }
  return unlocked;
}
