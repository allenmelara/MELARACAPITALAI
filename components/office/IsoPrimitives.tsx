import { boxFaces } from "./isoMath";

// Single base fill per object, shaded into 3 faces via CSS filter classes
// (see .iso-face-left/.iso-face-right in globals.css) instead of per-face
// color math — keeps every decoration a one-line color choice.
export function IsoBox({
  gx,
  gy,
  gz = 0,
  wx,
  wy,
  hz,
  fill,
  stroke
}: {
  gx: number;
  gy: number;
  gz?: number;
  wx: number;
  wy: number;
  hz: number;
  fill: string;
  stroke?: string;
}) {
  const faces = boxFaces(gx, gy, gz, wx, wy, hz);
  return (
    <g stroke={stroke ?? "none"} strokeWidth={stroke ? 1 : 0} strokeLinejoin="round">
      <polygon points={faces.left} fill={fill} className="iso-face-left" />
      <polygon points={faces.right} fill={fill} className="iso-face-right" />
      <polygon points={faces.top} fill={fill} className="iso-face-top" />
    </g>
  );
}

export function IsoFlat({
  points,
  fill,
  opacity,
  className
}: {
  points: string;
  fill: string;
  opacity?: number;
  className?: string;
}) {
  return <polygon points={points} fill={fill} opacity={opacity} className={className} />;
}
