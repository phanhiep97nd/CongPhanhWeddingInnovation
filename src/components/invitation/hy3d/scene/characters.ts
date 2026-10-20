import {
  BufferGeometry,
  CapsuleGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Material,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import { PALETTE, flat, toon } from "./materials";

// ── Rig & state ───────────────────────────────────────────────────────────────
// Chibi proportions: ~1.1 units tall, head ≈ 40% of the height. Every limb hangs from a pivot so poses
// are plain rotations that can be blended frame by frame.

export interface CharacterState {
  walk: number;        // 0..1 walk-cycle weight
  walkPhase: number;   // advanced by the scene from travelled distance
  lookYaw: number;     // head turn (radians)
  bodyYaw: number;     // whole-body turn relative to the path direction
  wave: number;        // right-arm wave
  point: number;       // right arm points forward
  hug: number;         // both arms around the partner
  hold: number;        // right arm raised holding something (gift envelope)
  celebrate: number;   // small happy hops
  sit: number;         // crouch toward a seated pose
}

export interface Character {
  root: Group;
  state: CharacterState;
  rightHand: Object3D;
  update: (dt: number, time: number) => void;
}

interface Rig {
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

function track<T extends BufferGeometry>(geometry: T) {
  geometries.push(geometry);
  return geometry;
}

export function disposeCharacterGeometries() {
  geometries.forEach((geometry) => geometry.dispose());
  geometries.length = 0;
}

function emptyState(): CharacterState {
  return { walk: 0, walkPhase: 0, lookYaw: 0, bodyYaw: 0, wave: 0, point: 0, hug: 0, hold: 0, celebrate: 0, sit: 0 };
}

// A mesh plus its inverted-hull outline, grouped so they move together.
function part(geometry: BufferGeometry, material: Material, outline = 0.018) {
  const group = new Group();
  const mesh = new Mesh(geometry, material);
  group.add(mesh);
  // Outline hulls were part of the cartoon look; the PBR scene relies on light and shadow instead.
  void outline;
  mesh.castShadow = true;
  return group;
}

function sphere(radius: number, widthSegments = 20, heightSegments = 16) {
  return track(new SphereGeometry(radius, widthSegments, heightSegments));
}

// ── Shared head ───────────────────────────────────────────────────────────────
const HEAD_RADIUS = 0.23;

function placeOnHead(object: Object3D, x: number, y: number, lift = 0.004) {
  const z = Math.sqrt(Math.max(HEAD_RADIUS * HEAD_RADIUS - x * x - y * y, 0)) + lift;
  object.position.set(x, y, z);
  object.lookAt(x * 3, y * 3, z * 3);
}

function buildFace(head: Group, options: { lashes: boolean; lips: string }) {
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
function hairCap(color: string, coverage = 0.5, radius = HEAD_RADIUS + 0.018) {
  return part(track(new SphereGeometry(radius, 22, 14, 0, Math.PI * 2, 0, Math.PI * coverage)), toon(color), 0.014);
}

// ── Pose solver ───────────────────────────────────────────────────────────────
function damp(current: number, target: number, rate: number, dt: number) {
  return MathUtils.damp(current, target, rate, dt);
}

function animate(rig: Rig, state: CharacterState, root: Group, dt: number, time: number, blink: { next: number; until: number }) {
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

// ── Groom ─────────────────────────────────────────────────────────────────────
export function buildGroom(colors: { suit?: string; accent?: string } = {}): Character {
  const suit = toon(colors.suit || PALETTE.suit);
  const skin = toon(PALETTE.skin);
  const root = new Group();
  root.name = "groom";

  const hips = new Group();
  hips.userData.baseY = 0.34;
  hips.position.y = hips.userData.baseY;
  root.add(hips);

  const legs: Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new Group();
    leg.position.set(side * 0.065, 0, 0);
    const thigh = part(track(new CapsuleGeometry(0.055, 0.17, 4, 10)), toon(PALETTE.trousers));
    thigh.position.y = -0.13;
    const shoe = part(sphere(0.06, 12, 8), toon("#1D1A1C"), 0.012);
    shoe.scale.set(1, 0.6, 1.5);
    shoe.position.set(0, -0.3, 0.025);
    leg.add(thigh, shoe);
    hips.add(leg);
    legs.push(leg);
  }

  const torso = new Group();
  torso.position.y = 0.02;
  hips.add(torso);
  const jacket = part(track(new CylinderGeometry(0.13, 0.165, 0.33, 18)), suit);
  jacket.position.y = 0.16;
  torso.add(jacket);
  const shirt = new Mesh(track(new ConeGeometry(0.06, 0.16, 3)), toon(PALETTE.shirt));
  shirt.rotation.x = Math.PI;
  shirt.position.set(0, 0.24, 0.125);
  shirt.scale.z = 0.25;
  torso.add(shirt);
  for (const side of [-1, 1]) {
    const bow = new Mesh(track(new ConeGeometry(0.03, 0.05, 10)), toon(colors.accent || PALETTE.son));
    bow.rotation.z = side * Math.PI / 2;
    bow.position.set(side * 0.025, 0.31, 0.145);
    torso.add(bow);
  }
  const knot = new Mesh(sphere(0.014, 8, 6), toon(colors.accent || PALETTE.son));
  knot.position.set(0, 0.31, 0.15);
  torso.add(knot);
  const boutonniere = new Mesh(sphere(0.022, 10, 8), toon(PALETTE.blush));
  boutonniere.position.set(0.085, 0.22, 0.125);
  torso.add(boutonniere);

  const arms: Group[] = [];
  let rightHand: Object3D = torso;
  for (const side of [-1, 1]) {
    const arm = new Group();
    arm.position.set(side * 0.165, 0.29, 0);
    const sleeve = part(track(new CapsuleGeometry(0.045, 0.15, 4, 10)), suit);
    sleeve.position.y = -0.1;
    const hand = part(sphere(0.048, 12, 10), skin, 0.012);
    hand.position.y = -0.22;
    arm.add(sleeve, hand);
    torso.add(arm);
    arms.push(arm);
    if (side === 1) rightHand = hand;
  }

  const head = new Group();
  head.position.y = 0.36;
  torso.add(head);
  const skull = part(sphere(HEAD_RADIUS, 26, 20), skin, 0.014);
  head.add(skull);
  const hair = hairCap(PALETTE.hairDark, 0.46);
  hair.rotation.x = -0.25;
  hair.position.y = 0.01;
  head.add(hair);
  const fringe = part(sphere(0.12, 14, 10), toon(PALETTE.hairDark), 0.012);
  fringe.scale.set(1.5, 0.55, 0.9);
  fringe.position.set(-0.05, 0.15, 0.13);
  fringe.rotation.z = 0.35;
  head.add(fringe);
  head.position.y += HEAD_RADIUS * 0.85;
  const eyes = buildFace(head, { lashes: false, lips: "#8A3A3F" });

  const rig: Rig = { hips, torso, head, armL: arms[0], armR: arms[1], legL: legs[0], legR: legs[1], eyes };
  const state = emptyState();
  const blink = { next: 1 + Math.random() * 2, until: 0 };
  return {
    root,
    state,
    rightHand,
    update: (dt, time) => animate(rig, state, root, dt, time, blink),
  };
}

// ── Bride ─────────────────────────────────────────────────────────────────────
export function buildBride(colors: { dress?: string; sash?: string; bouquet?: string[] } = {}): Character {
  const dress = toon(colors.dress || PALETTE.dress);
  const skin = toon(PALETTE.skin);
  const root = new Group();
  root.name = "bride";

  const hips = new Group();
  hips.userData.baseY = 0.0;
  root.add(hips);

  // Flared skirt drawn as a lathe profile from the waist to the hem.
  // Points run hem -> waist so the lathe faces point outward (the reverse order showed the outline hull).
  const profile = [
    new Vector2(0.0, 0.02),
    new Vector2(0.37, 0.02),
    new Vector2(0.33, 0.08),
    new Vector2(0.24, 0.24),
    new Vector2(0.17, 0.4),
    new Vector2(0.13, 0.5),
    new Vector2(0.0, 0.5),
  ];
  const skirt = part(track(new LatheGeometry(profile, 28)), dress, 0.012);
  hips.add(skirt);
  const hem = new Mesh(track(new TorusGeometry(0.36, 0.022, 8, 40)), toon(colors.sash || PALETTE.blush));
  hem.rotation.x = Math.PI / 2;
  hem.position.y = 0.04;
  hips.add(hem);

  const torso = new Group();
  torso.position.y = 0.5;
  hips.add(torso);
  const bodice = part(track(new CylinderGeometry(0.11, 0.13, 0.2, 18)), dress);
  bodice.position.y = 0.09;
  torso.add(bodice);
  const sash = new Mesh(track(new TorusGeometry(0.128, 0.02, 8, 28)), toon(colors.sash || PALETTE.blush));
  sash.rotation.x = Math.PI / 2;
  sash.position.y = 0.01;
  torso.add(sash);

  const arms: Group[] = [];
  let rightHand: Object3D = torso;
  for (const side of [-1, 1]) {
    const arm = new Group();
    arm.position.set(side * 0.13, 0.17, 0);
    const limb = part(track(new CapsuleGeometry(0.036, 0.15, 4, 10)), skin);
    limb.position.y = -0.1;
    const hand = part(sphere(0.042, 12, 10), skin, 0.012);
    hand.position.y = -0.21;
    arm.add(limb, hand);
    torso.add(arm);
    arms.push(arm);
    if (side === 1) rightHand = hand;
  }

  // Bouquet held in front by the left hand.
  const bouquet = new Group();
  const blooms = colors.bouquet?.length ? colors.bouquet : [PALETTE.blush, "#FFFFFF", PALETTE.son, PALETTE.blush, "#FFE8EC"];
  blooms.forEach((color, index) => {
    const angle = (index / blooms.length) * Math.PI * 2;
    const bloom = part(sphere(0.055, 10, 8), toon(color), 0.01);
    bloom.position.set(Math.cos(angle) * 0.06, 0.02 + (index % 2) * 0.02, Math.sin(angle) * 0.06);
    bouquet.add(bloom);
  });
  const centre = part(sphere(0.06, 10, 8), toon("#FFFFFF"), 0.01);
  centre.position.y = 0.05;
  bouquet.add(centre);
  const stem = new Mesh(track(new CylinderGeometry(0.02, 0.012, 0.1, 8)), toon(PALETTE.leaf));
  stem.position.y = -0.05;
  bouquet.add(stem);
  bouquet.position.set(0.08, -0.25, 0.13);
  arms[0].add(bouquet);

  const head = new Group();
  head.position.y = 0.2 + HEAD_RADIUS * 0.85;
  torso.add(head);
  const skull = part(sphere(HEAD_RADIUS, 26, 20), skin, 0.014);
  head.add(skull);
  const hair = hairCap(PALETTE.hairBrown, 0.5);
  hair.rotation.x = -0.15;
  head.add(hair);
  const bun = part(sphere(0.09, 14, 10), toon(PALETTE.hairBrown), 0.012);
  bun.position.set(0, 0.17, -0.14);
  head.add(bun);
  for (const side of [-1, 1]) {
    const lock = part(track(new CapsuleGeometry(0.035, 0.12, 4, 8)), toon(PALETTE.hairBrown), 0.01);
    lock.position.set(side * 0.205, -0.05, -0.03);
    lock.rotation.z = side * 0.15;
    head.add(lock);
  }
  const tiara = new Mesh(track(new TorusGeometry(0.11, 0.012, 6, 20, Math.PI)), toon(PALETTE.gold));
  tiara.position.set(0, 0.17, 0.08);
  tiara.rotation.x = -0.5;
  head.add(tiara);
  const veil = new Mesh(
    track(new ConeGeometry(0.26, 0.62, 24, 1, true, Math.PI * 0.35, Math.PI * 1.3)),
    // Soft translucent tulle.
    new MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.9, transparent: true, opacity: 0.45, side: DoubleSide, depthWrite: false }),
  );
  veil.position.set(0, -0.12, -0.12);
  veil.rotation.y = Math.PI;
  head.add(veil);
  const eyes = buildFace(head, { lashes: true, lips: "#C24B5A" });

  const rig: Rig = { hips, torso, head, armL: arms[0], armR: arms[1], eyes };
  const state = emptyState();
  const blink = { next: 1.6 + Math.random() * 2, until: 0 };
  return {
    root,
    state,
    rightHand,
    update: (dt, time) => animate(rig, state, root, dt, time, blink),
  };
}
