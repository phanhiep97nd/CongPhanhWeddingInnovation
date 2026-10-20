import { BufferGeometry, CapsuleGeometry, CircleGeometry, Group, Material, MathUtils, Mesh, Object3D, SphereGeometry, TorusGeometry } from "three";
import { PALETTE, flat, toon } from "./materials";

import type { CharacterState } from "./characters";

export interface Rig {
  hips: Group;
  torso: Group;
  head: Group;
  armL: Group;
  armR: Group;
  legL?: Group;
  legR?: Group;
  eyes: Mesh[];
}

const geometries: BufferGeometry[] = [];

export function track<T extends BufferGeometry>(geometry: T) {
  geometries.push(geometry);
  return geometry;
}

export function disposeCharacterGeometries() {
  geometries.forEach((geometry) => geometry.dispose());
  geometries.length = 0;
}

export function emptyState(): CharacterState {
  return { walk: 0, walkPhase: 0, lookYaw: 0, bodyYaw: 0, wave: 0, point: 0, hug: 0, hold: 0, celebrate: 0, sit: 0 };
}

// A mesh plus its inverted-hull outline, grouped so they move together.
export function part(geometry: BufferGeometry, material: Material, outline = 0.018) {
  const group = new Group();
  const mesh = new Mesh(geometry, material);
  group.add(mesh);
  // Outline hulls were part of the cartoon look; the PBR scene relies on light and shadow instead.
  void outline;
  mesh.castShadow = true;
  return group;
}

export function sphere(radius: number, widthSegments = 20, heightSegments = 16) {
  return track(new SphereGeometry(radius, widthSegments, heightSegments));
}

// ── Shared head ───────────────────────────────────────────────────────────────
export const HEAD_RADIUS = 0.23;

function placeOnHead(object: Object3D, x: number, y: number, lift = 0.004) {
  const z = Math.sqrt(Math.max(HEAD_RADIUS * HEAD_RADIUS - x * x - y * y, 0)) + lift;
  object.position.set(x, y, z);
  object.lookAt(x * 3, y * 3, z * 3);
}

export function buildFace(head: Group, options: { lashes: boolean; lips: string }) {
  const eyes: Mesh[] = [];
  for (const side of [-1, 1]) {
    const eye = new Mesh(sphere(0.034, 14, 10), flat(PALETTE.eye));
    eye.scale.set(0.85, 1.15, 0.45);
    placeOnHead(eye, side * 0.085, 0.0, -0.006);
    const shine = new Mesh(sphere(0.011, 8, 6), flat("#FFFFFF"));
    shine.position.set(0.012, 0.016, 0.03);
    eye.add(shine);
    head.add(eye);
    eyes.push(eye);

    const cheek = new Mesh(track(new CircleGeometry(0.036, 18)), flat(PALETTE.cheek, 0.55));
    placeOnHead(cheek, side * 0.135, -0.055, 0.002);
    head.add(cheek);

    if (options.lashes) {
      const lash = new Mesh(track(new CapsuleGeometry(0.006, 0.03, 2, 6)), flat(PALETTE.eye));
      lash.rotation.z = Math.PI / 2 + side * 0.35;
      placeOnHead(lash, side * 0.115, 0.035, 0.0);
      lash.rotation.z = Math.PI / 2 - side * 0.4;
      head.add(lash);
    }
  }

  const smile = new Mesh(track(new TorusGeometry(0.03, 0.007, 6, 14, Math.PI)), flat(options.lips));
  placeOnHead(smile, 0, -0.075, 0.0);
  smile.rotateZ(Math.PI);
  head.add(smile);

  for (const side of [-1, 1]) {
    const ear = part(sphere(0.045, 12, 10), toon(PALETTE.skin), 0.012);
    ear.position.set(side * 0.215, -0.01, 0);
    ear.scale.set(0.6, 1, 0.8);
    head.add(ear);
  }
  return eyes;
}

// Hair cap: the upper part of a slightly larger sphere, tilted back a little.
export function hairCap(color: string, coverage = 0.5, radius = HEAD_RADIUS + 0.018) {
  return part(track(new SphereGeometry(radius, 22, 14, 0, Math.PI * 2, 0, Math.PI * coverage)), toon(color), 0.014);
}

// ── Pose solver ───────────────────────────────────────────────────────────────
function damp(current: number, target: number, rate: number, dt: number) {
  return MathUtils.damp(current, target, rate, dt);
}

export function animate(rig: Rig, state: CharacterState, root: Group, dt: number, time: number, blink: { next: number; until: number }) {
  const swing = Math.sin(state.walkPhase) * state.walk;
  const hop = state.celebrate * Math.abs(Math.sin(time * 6.5)) * 0.08;
  const bob = Math.abs(Math.sin(state.walkPhase)) * 0.025 * state.walk;

  rig.hips.position.y = damp(rig.hips.position.y, rig.hips.userData.baseY - state.sit * 0.12 + bob + hop, 12, dt);
  rig.hips.rotation.z = damp(rig.hips.rotation.z, swing * 0.05, 10, dt);
  root.rotation.y = damp(root.rotation.y, state.bodyYaw, 6, dt);

  // Breathing keeps idle characters alive.
  rig.torso.scale.y = 1 + Math.sin(time * 2.2) * 0.012;

  if (rig.legL && rig.legR) {
    rig.legL.rotation.x = damp(rig.legL.rotation.x, swing * 0.55 - state.sit * 1.2, 14, dt);
    rig.legR.rotation.x = damp(rig.legR.rotation.x, -swing * 0.55 - state.sit * 1.2, 14, dt);
  }

  // Arms: walking swing, then layered gestures; the strongest gesture wins.
  const waveOscillation = Math.sin(time * 10) * 0.35;
  let rightX = -swing * 0.45;
  let rightZ = -0.12;
  let leftX = swing * 0.45;
  let leftZ = 0.12;

  rightX = MathUtils.lerp(rightX, -0.2, state.wave);
  rightZ = MathUtils.lerp(rightZ, -2.5 + waveOscillation, state.wave);
  rightX = MathUtils.lerp(rightX, -1.45, state.point);
  rightZ = MathUtils.lerp(rightZ, -0.25, state.point);
  rightX = MathUtils.lerp(rightX, -1.35, state.hold);
  rightZ = MathUtils.lerp(rightZ, -0.35, state.hold);
  rightX = MathUtils.lerp(rightX, -1.25, state.hug);
  rightZ = MathUtils.lerp(rightZ, 0.55, state.hug);
  leftX = MathUtils.lerp(leftX, -1.25, state.hug);
  leftZ = MathUtils.lerp(leftZ, -0.55, state.hug);
  const cheer = state.celebrate * (0.4 + Math.sin(time * 6.5) * 0.15);
  rightZ -= cheer * 2.2;
  leftZ += cheer * 2.2;

  rig.armR.rotation.x = damp(rig.armR.rotation.x, rightX, 12, dt);
  rig.armR.rotation.z = damp(rig.armR.rotation.z, rightZ, 12, dt);
  rig.armL.rotation.x = damp(rig.armL.rotation.x, leftX, 12, dt);
  rig.armL.rotation.z = damp(rig.armL.rotation.z, leftZ, 12, dt);

  rig.head.rotation.y = damp(rig.head.rotation.y, state.lookYaw, 7, dt);
  rig.head.rotation.z = damp(rig.head.rotation.z, Math.sin(time * 1.3) * 0.04 + state.hug * 0.12, 4, dt);

  // Blink every few seconds.
  if (time > blink.next) {
    blink.until = time + 0.12;
    blink.next = time + 2.5 + Math.random() * 3;
  }
  const eyeScale = time < blink.until ? 0.12 : 1.15;
  for (const eye of rig.eyes) eye.scale.y = damp(eye.scale.y, eyeScale, 30, dt);
}

