import { getTotalXp } from "@/lib/xp";
import { computeLevelInfo, unlocksForLevel } from "@/lib/xpCalc";
import { listGoals } from "@/lib/financialGoals";
import { getBudgetHistory } from "@/lib/monthlyBudget";
import { calculateSavingsStreak } from "@/lib/streaks";
import { getPlan } from "@/lib/profile";
import OfficeScene from "@/components/office/OfficeScene";
import OfficeHud from "@/components/office/OfficeHud";
import LevelUpBanner from "@/components/office/LevelUpBanner";

export default async function OfficePage() {
  const [totalXp, goals, budgetHistory, plan] = await Promise.all([
    getTotalXp(),
    listGoals(),
    getBudgetHistory(),
    getPlan()
  ]);

  const levelInfo = computeLevelInfo(totalXp);
  const unlocked = new Set(unlocksForLevel(levelInfo.level));
  const streak = calculateSavingsStreak(budgetHistory);

  return (
    <div className="office-page">
      <LevelUpBanner levelInfo={levelInfo} />
      <OfficeHud levelInfo={levelInfo} />
      <div className="office-scene-frame">
        <OfficeScene
          level={levelInfo.level}
          levelTitle={levelInfo.title}
          xpIntoLevel={levelInfo.xpIntoLevel}
          xpForNextLevel={levelInfo.xpForNextLevel}
          unlocked={unlocked}
          goals={goals}
          streakActive={streak.currentMonths > 0}
          plan={plan}
        />
      </div>
    </div>
  );
}
