import { CatmullRomCurve3, Vector3 } from "three";

// ── Path ──────────────────────────────────────────────────────────────────────
// A gently winding flower path walked from z = +2 toward -38. Arc-length parameter u ∈ [0, 1].
export const PATH = new CatmullRomCurve3([
  new Vector3(0, 0, 3),
  new Vector3(0, 0, -3),
  new Vector3(1.4, 0, -8.5),
  new Vector3(-1.2, 0, -14.5),
  new Vector3(1.3, 0, -20.5),
  new Vector3(-0.9, 0, -26.5),
  new Vector3(0.4, 0, -32),
  new Vector3(0, 0, -38),
]);
PATH.arcLengthDivisions = 600;
export const PATH_WIDTH = 1.7;

const up = new Vector3(0, 1, 0);

export function frameAt(u: number) {
  const point = PATH.getPointAt(clamp01(u));
  const tangent = PATH.getTangentAt(clamp01(u)).normalize();
  const side = new Vector3().crossVectors(up, tangent).normalize(); // points to the left of the walker
  return { point, tangent, side };
}

export function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

// Station u positions: evenly spaced between the start and the end gate.
export function stationPositions(count: number) {
  return Array.from({ length: count }, (_, index) => 0.06 + ((index + 1) / (count + 1)) * 0.88);
}

