"use client";

import { useEffect, useState } from "react";
import type { LevelInfo } from "@/lib/xpCalc";

const STORAGE_KEY = "melara:office-last-seen-level";

// Same one-at-a-time, localStorage-dismissed pattern as
// components/dashboard/CelebrationBanner.tsx, but tracks a single "last
// seen level" rather than a list of dismissed event ids — level-ups are
// inherently sequential (there's only ever one "current" level to compare
// against), unlike the score/goal/streak events CelebrationBanner handles.
export default function LevelUpBanner({ levelInfo }: { levelInfo: LevelInfo }) {
  const [lastSeenLevel, setLastSeenLevel] = useState<number | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // No stored value means this browser has never dismissed a level-up
      // banner before — treat the starting point as level 0 (the real
      // floor), not the current level, so a brand-new player's very first
      // real level-up still celebrates instead of being silently
      // suppressed as "already seen."
      setLastSeenLevel(stored !== null ? Number(stored) : 0);
    } catch {
      setLastSeenLevel(0);
    }
    // Only re-derive from storage on mount, not every time levelInfo.level
    // changes — a level-up banner should stay visible (unacknowledged)
    // across re-renders within the same visit, not silently reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setLastSeenLevel(levelInfo.level);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(levelInfo.level));
    } catch {
      // Ignore unavailable localStorage.
    }
  }

  if (lastSeenLevel === null || levelInfo.level <= lastSeenLevel) return null;

  return (
    <div className="notice celebration-banner">
      <span>
        Level up! You&apos;re now Level {levelInfo.level} — {levelInfo.title}.
      </span>
      <button className="celebration-dismiss" onClick={dismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
