// Pure 2:1 isometric projection helpers — no rendering, no React. The scene
// is built entirely from these projected polygons (see IsoPrimitives.tsx)
// rather than sprite images, since there's no asset pipeline for this app;
// shading comes from CSS `filter: brightness()` classes on top of a single
// base fill per object (see the ".iso-face-*" rules in globals.css), not
// per-face color math here.

export const TILE_W = 64;
export const TILE_H = 32;

export type Point = { x: number; y: number };

// gx/gy are grid coordinates on the floor plane, gz is height in plain
// pixels (not grid-scaled) — a box's "top" is just gz + hz.
export function project(gx: number, gy: number, gz = 0): Point {
  return { x: (gx - gy) * TILE_W, y: (gx + gy) * TILE_H - gz };
}

export function pointsAttr(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

// The three visible faces of an axis-aligned box spanning grid rectangle
// [gx, gx+wx] x [gy, gy+wy] x [gz, gz+hz].
export function boxFaces(gx: number, gy: number, gz: number, wx: number, wy: number, hz: number) {
  const top = gz + hz;
  const p0 = project(gx, gy, top);
  const p1 = project(gx + wx, gy, top);
  const p2 = project(gx + wx, gy + wy, top);
  const p3 = project(gx, gy + wy, top);
  const p1Base = project(gx + wx, gy, gz);
  const p2Base = project(gx + wx, gy + wy, gz);
  const p3Base = project(gx, gy + wy, gz);

  return {
    top: pointsAttr([p0, p1, p2, p3]),
    left: pointsAttr([p3Base, p2Base, p2, p3]),
    right: pointsAttr([p1Base, p2Base, p2, p1])
  };
}

// A flat quad on the x=0 (left/west) wall plane.
export function leftWallQuad(gy0: number, gz0: number, wy: number, hz: number): string {
  return pointsAttr([project(0, gy0, gz0), project(0, gy0 + wy, gz0), project(0, gy0 + wy, gz0 + hz), project(0, gy0, gz0 + hz)]);
}

// A flat quad on the y=0 (right/north) wall plane.
export function rightWallQuad(gx0: number, gz0: number, wx: number, hz: number): string {
  return pointsAttr([project(gx0, 0, gz0), project(gx0 + wx, 0, gz0), project(gx0 + wx, 0, gz0 + hz), project(gx0, 0, gz0 + hz)]);
}

// A flat quad on the floor (z=0) plane.
export function floorQuad(gx: number, gy: number, wx: number, wy: number): string {
  return pointsAttr([project(gx, gy, 0), project(gx + wx, gy, 0), project(gx + wx, gy + wy, 0), project(gx, gy + wy, 0)]);
}
