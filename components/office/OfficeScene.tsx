import Link from "next/link";
import type { DecorationId } from "@/lib/xpCalc";
import type { Plan } from "@/lib/profile";
import { project, leftWallQuad, rightWallQuad, floorQuad } from "./isoMath";
import { IsoBox, IsoFlat } from "./IsoPrimitives";

const ROOM_W = 6;
const ROOM_D = 6;
const WALL_HEIGHT = 220;

export type OfficeGoal = { id: string; name: string; currentAmount: number; targetAmount: number };

export type OfficeSceneProps = {
  level: number;
  levelTitle: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  unlocked: Set<DecorationId>;
  goals: OfficeGoal[];
  streakActive: boolean;
  plan: Plan;
};

// Every clickable object in the scene is a real Next.js navigation to an
// existing, unmodified page — the game is a new visual/nav shell in front
// of the app, not a rewrite of any feature. Decorations gated behind a
// level (see lib/xpCalc.ts's unlocksForLevel) still need SOMETHING to click
// at level 0, so the nav-relevant props (monitor, window, wall chart,
// nameplate) always render a plain base shape; the level unlock only adds
// a visual flourish on top, never the hotspot itself.
function Hotspot({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="office-hotspot" aria-label={label}>
      {children}
    </Link>
  );
}

function Character({ has }: { has: (id: DecorationId) => boolean }) {
  // Seated on top of the chair (gz starts at the chair's seat height) rather
  // than sharing its footprint at floor level, so the two boxes don't
  // visually collide.
  const gx = 3.15;
  const gy = 1.15;
  const seatZ = 42;
  const bodyHeight = 46;
  const bodyColor = has("corner-office") ? "#d4af37" : has("blazer-upgrade") ? "var(--accent)" : has("blazer") ? "#3f6b52" : "#26392f";
  const headCenter = project(gx + 0.2, gy + 0.2, seatZ + bodyHeight + 15);

  return (
    <g>
      <IsoBox gx={gx} gy={gy} gz={seatZ} wx={0.4} wy={0.4} hz={bodyHeight} fill={bodyColor} />
      <circle cx={headCenter.x} cy={headCenter.y} r={14} fill="#e3b98a" stroke="var(--border)" strokeWidth={1} />
      {has("blazer") && (
        <rect
          x={headCenter.x - 8}
          y={headCenter.y + 11}
          width={16}
          height={6}
          rx={1.5}
          fill="var(--accent)"
          opacity={0.85}
        />
      )}
    </g>
  );
}

const DESK_GX = 2.1;
const DESK_GY = 1.85;
const DESK_TOP_Z = 46;

function Desk() {
  return <IsoBox gx={DESK_GX} gy={DESK_GY} gz={0} wx={2.1} wy={0.95} hz={DESK_TOP_Z} fill="#3a2a1d" />;
}

// Financial Profile — always reachable; "nameplate" (level 3) only swaps in
// a brighter plate, "gold-nameplate" (level 10) makes it gold.
function Nameplate({ has }: { has: (id: DecorationId) => boolean }) {
  const fill = has("gold-nameplate") ? "#d4af37" : has("nameplate") ? "var(--muted)" : "#2a352e";
  return (
    <Hotspot href="/dashboard/onboarding" label="Financial Profile">
      <IsoFlat points={rightWallQuad(DESK_GX + 0.15, DESK_TOP_Z, 0.5, 10)} fill={fill} />
    </Hotspot>
  );
}

// Portfolio Tracker — always reachable; "monitor" (level 1) lights the
// screen green, "second-monitor" (level 7) adds a second one alongside.
function Monitors({ has }: { has: (id: DecorationId) => boolean }) {
  return (
    <>
      <Hotspot href="/dashboard/portfolio" label="Portfolio Tracker">
        <IsoBox gx={DESK_GX + 0.25} gy={DESK_GY + 0.15} gz={DESK_TOP_Z} wx={0.55} wy={0.1} hz={38} fill={has("monitor") ? "#123322" : "#1c231f"} />
      </Hotspot>
      {has("second-monitor") && (
        <IsoBox gx={DESK_GX + 1.0} gy={DESK_GY + 0.15} gz={DESK_TOP_Z} wx={0.55} wy={0.1} hz={38} fill="#123322" />
      )}
    </>
  );
}

function DeskExtras({ has }: { has: (id: DecorationId) => boolean }) {
  return (
    <>
      {has("desk-lamp") && <IsoBox gx={DESK_GX + 1.7} gy={DESK_GY + 0.15} gz={DESK_TOP_Z} wx={0.2} wy={0.2} hz={30} fill="var(--accent)" />}
      <Hotspot href="/dashboard/documents" label="Document Analysis">
        <IsoBox gx={DESK_GX + 0.15} gy={DESK_GY + 0.7} gz={DESK_TOP_Z} wx={0.35} wy={0.2} hz={8} fill="#8a8f7a" />
      </Hotspot>
      <Hotspot href="/dashboard/settings" label="Settings">
        <IsoBox gx={DESK_GX + 1.85} gy={DESK_GY + 0.65} gz={DESK_TOP_Z} wx={0.22} wy={0.18} hz={6} fill="#5a5a5a" />
      </Hotspot>
    </>
  );
}

function Chair({ has }: { has: (id: DecorationId) => boolean }) {
  const fill = has("office-chair") ? "#1c2a22" : "#4a3a2a";
  return <IsoBox gx={3.05} gy={1.05} gz={0} wx={0.55} wy={0.55} hz={42} fill={fill} />;
}

function FilingCabinet({ has }: { has: (id: DecorationId) => boolean }) {
  const fill = has("cabinet-upgrade") ? "#6b4a2f" : "#3a4640";
  return (
    <Hotspot href="/dashboard/accounts" label="Accounts & Bills">
      <IsoBox gx={0.3} gy={4.4} gz={0} wx={0.8} wy={0.8} hz={95} fill={fill} />
    </Hotspot>
  );
}

function Plant({ has }: { has: (id: DecorationId) => boolean }) {
  if (!has("plant-small")) return null;
  const large = has("plant-large");
  return (
    <g>
      <IsoBox gx={5.1} gy={4.6} gz={0} wx={0.5} wy={0.5} hz={20} fill="#5a4530" />
      <IsoBox gx={5.15} gy={4.65} gz={20} wx={0.4} wy={0.4} hz={large ? 60 : 32} fill="#3f7a52" />
    </g>
  );
}

function TrophyShelf({ has }: { has: (id: DecorationId) => boolean }) {
  if (!has("trophy-1")) return null;
  const count = has("trophy-3") ? 3 : 1;
  const shelfZ = 150;
  return (
    <g>
      <IsoFlat points={rightWallQuad(4.3, shelfZ, 1.4, 6)} fill="#6b4a2f" />
      {Array.from({ length: count }).map((_, i) => (
        <IsoBox key={i} gx={4.4 + i * 0.4} gy={0.08} gz={shelfZ + 6} wx={0.2} wy={0.2} hz={22} fill="#d4af37" />
      ))}
    </g>
  );
}

// Real Estate — always reachable via a plain window frame; "skyline-window"
// (level 5) adds the glowing skyline, "second-window" (level 9) adds a
// second pane.
function Windows({ has }: { has: (id: DecorationId) => boolean }) {
  const lit = has("skyline-window");
  return (
    <>
      <Hotspot href="/dashboard/real-estate" label="Real Estate">
        <g>
          <IsoFlat points={leftWallQuad(1.0, 40, 1.3, 130)} fill="#0d2b3a" />
          {lit && (
            <>
              <IsoFlat points={leftWallQuad(1.15, 55, 0.15, 40)} fill="#69e59b" opacity={0.55} />
              <IsoFlat points={leftWallQuad(1.4, 70, 0.15, 65)} fill="#69e59b" opacity={0.4} />
              <IsoFlat points={leftWallQuad(1.65, 60, 0.15, 90)} fill="#69e59b" opacity={0.5} />
            </>
          )}
        </g>
      </Hotspot>
      {has("second-window") && (
        <g>
          <IsoFlat points={leftWallQuad(2.6, 40, 1.3, 130)} fill="#0d2b3a" />
          <IsoFlat points={leftWallQuad(2.75, 60, 0.15, 75)} fill="#69e59b" opacity={0.45} />
          <IsoFlat points={leftWallQuad(3.0, 50, 0.15, 100)} fill="#69e59b" opacity={0.55} />
        </g>
      )}
    </>
  );
}

// Financial Health — always reachable via a blank panel; "wall-chart"
// (level 4) fills in the bar chart.
function WallChart({ has }: { has: (id: DecorationId) => boolean }) {
  const filled = has("wall-chart");
  return (
    <Hotspot href="/dashboard/health" label="Financial Health">
      <g>
        <IsoFlat points={rightWallQuad(1.1, 90, 1.0, 80)} fill="#101c16" />
        {filled && (
          <>
            <IsoFlat points={rightWallQuad(1.2, 100, 0.8, 15)} fill="var(--accent)" opacity={0.5} />
            <IsoFlat points={rightWallQuad(1.2, 130, 0.8, 35)} fill="var(--accent)" opacity={0.7} />
            <IsoFlat points={rightWallQuad(1.2, 155, 0.8, 55)} fill="var(--accent)" opacity={0.9} />
          </>
        )}
      </g>
    </Hotspot>
  );
}

function Corkboard({ goals }: { goals: OfficeGoal[] }) {
  const shown = goals.slice(0, 5);
  const cardW = 0.32;
  const gap = 0.08;
  const zBase = 60;
  const cardH = 90;
  const startGx = 0.3;
  const width = Math.max(0.6, shown.length * (cardW + gap) + 0.1);

  return (
    <Hotspot href="/dashboard/goals" label="Goals">
      <g>
        <IsoFlat points={rightWallQuad(startGx - 0.1, zBase - 10, width, cardH + 20)} fill="#4a3a28" />
        {shown.map((goal, i) => {
          const progress = goal.targetAmount > 0 ? Math.min(1, goal.currentAmount / goal.targetAmount) : 0;
          const gx0 = startGx + i * (cardW + gap);
          return (
            <g key={goal.id}>
              <title>{`${goal.name}: ${Math.round(progress * 100)}%`}</title>
              <IsoFlat points={rightWallQuad(gx0, zBase, cardW, cardH)} fill="#f3f7f4" opacity={0.15} />
              <IsoFlat points={rightWallQuad(gx0, zBase, cardW, cardH * progress)} fill="var(--accent)" />
            </g>
          );
        })}
      </g>
    </Hotspot>
  );
}

function StreakBadge({ active }: { active: boolean }) {
  if (!active) return null;
  const center = project(3.5, 1.2, 123);
  return (
    <g>
      <circle cx={center.x} cy={center.y} r={9} fill="#ff8f4d" stroke="var(--bg)" strokeWidth={1.5} />
      <text x={center.x} y={center.y + 4} fontSize={11} textAnchor="middle">
        🔥
      </text>
    </g>
  );
}

function Rug({ has }: { has: (id: DecorationId) => boolean }) {
  if (!has("rug")) return null;
  return <IsoFlat points={floorQuad(1.6, 2.9, 3.0, 2.0)} fill="#4a3a5a" className="office-rug" />;
}

function Bookshelf() {
  return (
    <Hotspot href="/dashboard/learn" label="Learn">
      <IsoBox gx={0.3} gy={1.0} gz={0} wx={0.55} wy={0.55} hz={140} fill="#4a3626" />
    </Hotspot>
  );
}

function PiggyBank() {
  return (
    <Hotspot href="/dashboard/wealth" label="Wealth Planner">
      <IsoBox gx={0.9} gy={5.1} gz={0} wx={0.4} wy={0.4} hz={35} fill="#d99a4e" />
    </Hotspot>
  );
}

function ResearchBinders() {
  return (
    <Hotspot href="/dashboard/company" label="Company Research">
      <IsoBox gx={1.7} gy={5.1} gz={0} wx={0.5} wy={0.35} hz={32} fill="#5a6b8a" />
    </Hotspot>
  );
}

function ArchiveTray() {
  return (
    <Hotspot href="/dashboard/reports" label="Saved Reports">
      <IsoBox gx={1.2} gy={4.15} gz={0} wx={0.4} wy={0.3} hz={25} fill="#7a6a4a" />
    </Hotspot>
  );
}

function CornerTV() {
  return (
    <Hotspot href="/dashboard/news" label="News Feed">
      <g>
        <IsoFlat points={rightWallQuad(3.0, 40, 0.8, 55)} fill="#1a2a22" />
        <IsoFlat points={rightWallQuad(3.1, 55, 0.6, 30)} fill="#69e59b" opacity={0.4} />
      </g>
    </Hotspot>
  );
}

function Certificate() {
  return (
    <Hotspot href="/pricing" label="Billing">
      <g>
        <IsoFlat points={leftWallQuad(4.2, 110, 0.9, 55)} fill="#3a2a1d" />
        <IsoFlat points={leftWallQuad(4.32, 118, 0.66, 39)} fill="#f3f7f4" opacity={0.25} />
      </g>
    </Hotspot>
  );
}

function ExitDoor() {
  return (
    <Hotspot href="/dashboard/analytics" label="Dashboard analytics">
      <g>
        <IsoFlat points={leftWallQuad(5.0, 0, 0.85, 160)} fill="#2a3a30" />
        <IsoFlat points={leftWallQuad(5.72, 60, 0.08, 12)} fill="#d4af37" />
      </g>
    </Hotspot>
  );
}

function PerformanceReport({ plan }: { plan: Plan }) {
  if (plan !== "business") return null;
  return (
    <Hotspot href="/dashboard/usage" label="Usage Analytics">
      <g>
        <IsoFlat points={rightWallQuad(4.7, 40, 0.75, 55)} fill="#101c16" />
        <IsoFlat points={rightWallQuad(4.78, 48, 0.15, 20)} fill="var(--accent)" opacity={0.6} />
        <IsoFlat points={rightWallQuad(4.98, 48, 0.15, 35)} fill="var(--accent)" opacity={0.8} />
        <IsoFlat points={rightWallQuad(5.18, 48, 0.15, 45)} fill="var(--accent)" opacity={0.9} />
      </g>
    </Hotspot>
  );
}

export default function OfficeScene({ unlocked, goals, streakActive, plan }: OfficeSceneProps) {
  const has = (id: DecorationId) => unlocked.has(id);

  const floor = floorQuad(0, 0, ROOM_W, ROOM_D);
  const leftWall = leftWallQuad(0, 0, ROOM_D, WALL_HEIGHT);
  const rightWall = rightWallQuad(0, 0, ROOM_W, WALL_HEIGHT);

  return (
    <svg viewBox="-420 -300 840 740" className="office-scene-svg" role="img" aria-label="Your office">
      <polygon points={leftWall} fill="var(--panel)" />
      <polygon points={rightWall} fill="var(--panel2)" />
      <Windows has={has} />
      <WallChart has={has} />
      <Corkboard goals={goals} />
      <CornerTV />
      <Certificate />
      <ExitDoor />
      <PerformanceReport plan={plan} />
      <TrophyShelf has={has} />
      <polygon points={floor} fill="#14231b" />
      <Rug has={has} />
      <Bookshelf />
      <FilingCabinet has={has} />
      <ArchiveTray />
      <PiggyBank />
      <ResearchBinders />
      <Plant has={has} />
      <Desk />
      <DeskExtras has={has} />
      <Nameplate has={has} />
      <Monitors has={has} />
      <Chair has={has} />
      <Character has={has} />
      <StreakBadge active={streakActive} />
    </svg>
  );
}
