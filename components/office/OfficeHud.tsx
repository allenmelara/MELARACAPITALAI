import type { LevelInfo } from "@/lib/xpCalc";

export default function OfficeHud({ levelInfo }: { levelInfo: LevelInfo }) {
  const span = levelInfo.xpIntoLevel + levelInfo.xpForNextLevel;
  const pct = span > 0 ? Math.round((levelInfo.xpIntoLevel / span) * 100) : 100;

  return (
    <div className="office-hud">
      <div className="office-hud-title">
        <span className="office-hud-level">Level {levelInfo.level}</span>
        <span className="office-hud-name">{levelInfo.title}</span>
      </div>
      <div className="office-hud-bar">
        <div className="office-hud-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="office-hud-xp">
        {levelInfo.xpIntoLevel} / {span} XP to next level
      </div>
    </div>
  );
}
