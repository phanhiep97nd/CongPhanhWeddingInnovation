import { Group, MathUtils, Vector2, Vector3 } from "three";
import { frameAt } from "./path";

interface CameraPose {
  coupleU: number;
  centre: Vector3;
  orbit: number;
  tilt: Vector2;
  distance: number;
  characterScale: number;
  aspect: number;
  fov: number;
  lookBias: number;
  lift?: number;          // extra camera height in metres (the crane move at the end)
  focus?: Vector3;
  envelope?: Group;
}

export function cameraPose(pose: CameraPose, position: Vector3, look: Vector3) {
  const { tangent, side } = frameAt(pose.coupleU);
  const orbit = pose.orbit + pose.tilt.x * 0.25;
  const offset = tangent.multiplyScalar(Math.cos(orbit)).addScaledVector(side, Math.sin(orbit));
  position.copy(pose.centre).addScaledVector(offset, pose.distance * pose.characterScale);
  position.y = (1.35 + (pose.lift ?? 0)) * pose.characterScale + pose.tilt.y * 0.25 + (pose.aspect < 0.8 ? 0.15 : 0);
  look.copy(pose.centre).setY(0.62 * pose.characterScale);
  if (pose.focus) look.lerp(pose.focus.clone().setY(0.8), pose.lookBias);
  if (pose.envelope) {
    const halfFov = MathUtils.degToRad(pose.fov / 2);
    const fitWidth = 0.95 / (Math.tan(halfFov) * pose.aspect);
    const fitHeight = 1.0 / Math.tan(halfFov);
    const distance = Math.max(fitWidth, fitHeight, 2.2);
    position.copy(pose.envelope.position).addScaledVector(frameAt(0.02).tangent, distance).add(new Vector3(0, 0.05, 0));
    look.copy(pose.envelope.position).add(new Vector3(0, 0.12, 0));
  }
}
