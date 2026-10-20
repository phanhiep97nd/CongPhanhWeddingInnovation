import { CapsuleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Group, LatheGeometry, Mesh, MeshStandardMaterial, Object3D, TorusGeometry, Vector2 } from "three";
import { HEAD_RADIUS, animate, buildFace, emptyState, hairCap, part, sphere, track, type Rig } from "./characterRig";
export { disposeCharacterGeometries } from "./characterRig";
import { batchCharacter } from "./batchCharacter";
import { PALETTE, toon } from "./materials";

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
  batchCharacter(root);
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
  batchCharacter(root);
  const state = emptyState();
  const blink = { next: 1.6 + Math.random() * 2, until: 0 };
  return {
    root,
    state,
    rightHand,
    update: (dt, time) => animate(rig, state, root, dt, time, blink),
  };
}
