import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { foliageGeometry, roseGeometry } from "./flowers";
import { PALETTE, surface } from "./materials";
import { mergeStatic } from "./mergeStatic";
import { frameAt } from "./path";
import { hySign, lantern } from "./props";
import { track } from "./resources";
import { FONTS, textCard } from "./textures";
import type { SceneData } from "./sceneData";

// Landmarks that frame the walk: a wedding backdrop behind the couple at the start, and their new home at the end
// of the path. Static parts are merged (mergeStatic) so each landmark costs only a handful of draw calls.

const WHITE_WOOD = "#F6F0E8";
const DRAPE = "#F4C7CF";
const DRAPE_LIGHT = "#FBE6EA";

function mesh(geometry: ConstructorParameters<typeof Mesh>[0], material: MeshStandardMaterial | MeshBasicMaterial, shadow = false) {
  const object = new Mesh(track(geometry!), material);
  object.castShadow = shadow;
  object.receiveShadow = true;
  return object;
}

// A ring of instanced roses with foliage, used to dress the backdrop and the porch.
function roseCluster(points: Vector3[], colors: string[], scale = 1.1, withLeaves = true) {
  const group = new Group();
  const blooms = new InstancedMesh(track(roseGeometry()), surface("#FFFFFF", { vertexColors: true, roughness: 0.55, doubleSide: true, sheen: true }), points.length);
  const leaves = new InstancedMesh(track(foliageGeometry()), surface("#FFFFFF", { vertexColors: true, roughness: 0.75, doubleSide: true }), points.length);
  const dummy = new Object3D();
  points.forEach((point, index) => {
    dummy.position.copy(point);
    dummy.rotation.set(Math.sin(index * 1.7) * 0.6, index * 2.3, Math.cos(index * 1.3) * 0.6);
    dummy.scale.setScalar(scale * (0.85 + ((index * 37) % 10) / 30));
    dummy.updateMatrix();
    blooms.setMatrixAt(index, dummy.matrix);
    leaves.setMatrixAt(index, dummy.matrix);
    blooms.setColorAt(index, new Color(colors[index % colors.length]));
  });
  group.add(blooms);
  if (withLeaves) group.add(leaves);
  else leaves.dispose();
  return group;
}

function clusterPoints(centre: Vector3, count: number, spread: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = index * 2.399;
    const radius = spread * Math.sqrt((index + 0.5) / count);
    return new Vector3(centre.x + Math.cos(angle) * radius, centre.y + Math.sin(angle) * radius * 0.8, centre.z + Math.sin(index * 1.1) * 0.06);
  });
}

// ── Wedding backdrop (start) ──────────────────────────────────────────────────
export function weddingBackdrop(data: SceneData, lowPower = false) {
  const root = new Group();
  const statics = new Group();
  const wood = surface(WHITE_WOOD, { roughness: 0.75 });

  // Arch frame: two pillars and a semicircular top.
  for (const x of [-1.6, 1.6]) {
    const pillar = mesh(new BoxGeometry(0.16, 2.4, 0.16), wood, true);
    pillar.position.set(x, 1.2, 0);
    statics.add(pillar);
  }
  const arch = mesh(new TorusGeometry(1.6, 0.08, 10, 40, Math.PI), wood, true);
  arch.position.y = 2.4;
  statics.add(arch);

  // Voile drapes: swags hanging between the arch and the pillars, two tones of blush.
  const drape = surface(DRAPE, { roughness: 0.9, sheen: true });
  const drapeLight = surface(DRAPE_LIGHT, { roughness: 0.9, sheen: true });
  [-1, 1].forEach((side) => {
    const swag = mesh(new TorusGeometry(0.85, 0.07, 8, 24, Math.PI), side < 0 ? drape : drapeLight);
    swag.position.set(side * 0.8, 3.05, 0.06);
    swag.rotation.z = Math.PI;
    statics.add(swag);
    const fall = mesh(new CylinderGeometry(0.09, 0.22, 2.3, 10, 1, true), side < 0 ? drapeLight : drape);
    fall.position.set(side * 1.72, 1.35, 0.05);
    statics.add(fall);
  });

  // Back panel with the couple's names, framed in white wood.
  const panelFrame = mesh(new BoxGeometry(2.3, 1.55, 0.06), wood, true);
  panelFrame.position.set(0, 1.55, -0.12);
  statics.add(panelFrame);
  const names = textCard(
    [
      { text: "Save the date", font: FONTS.serif, weight: 600, color: PALETTE.moss, size: 30, gap: 6 },
      { text: data.groom, font: FONTS.script, color: PALETTE.son, size: 84, gap: 0 },
      { text: "&", font: FONTS.serif, weight: 600, color: PALETTE.gold, size: 40, gap: 0 },
      { text: data.bride, font: FONTS.script, color: PALETTE.son, size: 84, gap: 10 },
      { text: data.dateText, font: FONTS.sans, weight: 500, color: PALETTE.moss, size: 26 },
    ],
    { width: 640, height: 430, background: PALETTE.paper, border: PALETTE.gold },
  );
  const panel = new Mesh(track(new PlaneGeometry(2.14, 1.42)), new MeshBasicMaterial({ map: names }));
  panel.position.set(0, 1.55, -0.085);
  root.add(panel);

  const sign = hySign(0.42, true);
  sign.position.set(0, 2.62, 0.02);
  statics.add(sign);

  // Aisle carpet leading from the backdrop onto the flower path.
  const carpet = mesh(new BoxGeometry(1.15, 0.012, 3.2), surface("#B8424F", { roughness: 0.95 }));
  carpet.position.set(0, 0.012, 1.7);
  statics.add(carpet);

  for (const x of [-2.25, 2.25]) {
    const light = lantern();
    light.position.set(x, 0, 0.3);
    statics.add(light);
  }

  root.add(mergeStatic(statics));

  // Flowers at the base of the pillars and the arch shoulders (a third as many on low-power phones, no crown).
  const density = lowPower ? 0.3 : 1;
  const roseColors = ["#F4B9C3", "#FFFFFF", "#C94E5E", "#F7D6DA"];
  root.add(roseCluster([
    ...clusterPoints(new Vector3(-1.6, 0.35, 0.12), Math.round(10 * density), 0.42),
    ...clusterPoints(new Vector3(1.6, 0.35, 0.12), Math.round(10 * density), 0.42),
    ...clusterPoints(new Vector3(-1.35, 3.05, 0.12), Math.round(7 * density), 0.36),
    ...clusterPoints(new Vector3(1.35, 3.05, 0.12), Math.round(7 * density), 0.36),
    ...(lowPower ? [] : clusterPoints(new Vector3(0, 4.0, 0.12), 6, 0.3)),
  ], roseColors, 1.1, !lowPower));
  return root;
}

// ── New home (end) ────────────────────────────────────────────────────────────
export interface NewHome {
  root: Group;
  door: Group;          // hinge pivot; rotation.y opens the door
  glow: MeshBasicMaterial;   // warm interior light revealed by the open door
  focus: Vector3;       // where the camera looks at the end
}

export function newHome(lowPower = false): NewHome {
  const root = new Group();
  const statics = new Group();
  const plaster = surface("#F3ECE2", { roughness: 0.92 });
  const trim = surface(WHITE_WOOD, { roughness: 0.7 });
  const roofTiles = surface("#B4553E", { roughness: 0.82 });
  const timber = surface("#6E4A33", { roughness: 0.8 });
  const width = 4.2;
  const depth = 3.4;
  const wallHeight = 2.5;

  // Walls (the front wall is built around the door opening).
  const back = mesh(new BoxGeometry(width, wallHeight, 0.18), plaster, true);
  back.position.set(0, wallHeight / 2, -depth);
  const left = mesh(new BoxGeometry(0.18, wallHeight, depth), plaster, true);
  left.position.set(-width / 2, wallHeight / 2, -depth / 2);
  const right = left.clone();
  right.position.x = width / 2;
  statics.add(back, left, right);
  const doorWidth = 1.0;
  const doorHeight = 2.0;
  const sideWidth = (width - doorWidth) / 2;
  for (const side of [-1, 1]) {
    const wall = mesh(new BoxGeometry(sideWidth, wallHeight, 0.18), plaster, true);
    wall.position.set(side * (doorWidth / 2 + sideWidth / 2), wallHeight / 2, 0);
    statics.add(wall);
  }
  const lintel = mesh(new BoxGeometry(doorWidth, wallHeight - doorHeight, 0.18), plaster, true);
  lintel.position.set(0, doorHeight + (wallHeight - doorHeight) / 2, 0);
  statics.add(lintel);

  // Gabled roof: a triangle extruded front to back, with overhanging tile planes.
  const gable = new Shape();
  gable.moveTo(-width / 2 - 0.05, 0);
  gable.lineTo(width / 2 + 0.05, 0);
  gable.lineTo(0, 1.5);
  gable.closePath();
  const gableWall = mesh(new ExtrudeGeometry(gable, { depth, bevelEnabled: false }), plaster, true);
  gableWall.position.set(0, wallHeight, -depth);
  statics.add(gableWall);
  const slope = Math.hypot(width / 2 + 0.35, 1.5);
  const pitch = Math.atan2(1.5, width / 2 + 0.35);
  for (const side of [-1, 1]) {
    const roof = mesh(new BoxGeometry(slope + 0.2, 0.12, depth + 0.6), roofTiles, true);
    roof.position.set(side * (width / 4 + 0.08), wallHeight + 0.78, -depth / 2);
    roof.rotation.z = -side * pitch;
    statics.add(roof);
  }
  const chimney = mesh(new BoxGeometry(0.4, 1.1, 0.4), surface("#A55A44", { roughness: 0.9 }), true);
  chimney.position.set(1.1, wallHeight + 1.35, -depth * 0.65);
  statics.add(chimney);

  // Door frame, porch step and window frames in white wood.
  const frameTop = mesh(new BoxGeometry(doorWidth + 0.24, 0.12, 0.24), trim);
  frameTop.position.set(0, doorHeight + 0.06, 0.02);
  statics.add(frameTop);
  for (const side of [-1, 1]) {
    const post = mesh(new BoxGeometry(0.12, doorHeight, 0.24), trim);
    post.position.set(side * (doorWidth / 2 + 0.06), doorHeight / 2, 0.02);
    statics.add(post);
  }
  const step = mesh(new BoxGeometry(2.2, 0.16, 0.9), surface("#D8CCBE", { roughness: 0.95 }));
  step.position.set(0, 0.08, 0.5);
  statics.add(step);

  const windowGlass = new MeshBasicMaterial({ color: new Color("#FFD9A0") });
  for (const side of [-1, 1]) {
    const frame = mesh(new BoxGeometry(0.95, 0.95, 0.12), trim);
    frame.position.set(side * 1.35, 1.45, 0.05);
    statics.add(frame);
    const glass = new Mesh(track(new PlaneGeometry(0.78, 0.78)), windowGlass);
    glass.position.set(side * 1.35, 1.45, 0.115);
    root.add(glass);
    const mullion = mesh(new BoxGeometry(0.05, 0.78, 0.04), trim);
    mullion.position.set(side * 1.35, 1.45, 0.13);
    const transom = mesh(new BoxGeometry(0.78, 0.05, 0.04), trim);
    transom.position.set(side * 1.35, 1.45, 0.13);
    const planter = mesh(new BoxGeometry(1.0, 0.18, 0.26), timber);
    planter.position.set(side * 1.35, 0.92, 0.2);
    statics.add(mullion, transom, planter);
  }

  root.add(mergeStatic(statics));

  // Warm interior light behind the door, revealed as it swings open.
  const glow = new MeshBasicMaterial({ color: new Color("#FFC98A"), transparent: true, opacity: 0.35 });
  const interior = new Mesh(track(new PlaneGeometry(doorWidth, doorHeight)), glow);
  interior.position.set(0, doorHeight / 2, -0.06);
  root.add(interior);

  // The door: a hinged leaf in deep wood with a gold 囍 and a brass knob.
  // The leaf, sign and knob are merged into a few meshes that hang from the hinge pivot.
  const door = new Group();
  door.position.set(-doorWidth / 2, 0, 0.02);
  const leafParts = new Group();
  const leaf = mesh(new BoxGeometry(doorWidth, doorHeight, 0.07), surface("#7B2F35", { roughness: 0.55 }), true);
  leaf.position.set(doorWidth / 2, doorHeight / 2, 0);
  leafParts.add(leaf);
  const sign = hySign(0.34, true);
  sign.position.set(doorWidth / 2, doorHeight * 0.66, 0.05);
  leafParts.add(sign);
  const knob = new Mesh(track(new SphereGeometry(0.045, 12, 8)), surface(PALETTE.gold, { metalness: 0.8, roughness: 0.3 }));
  knob.position.set(doorWidth - 0.12, doorHeight * 0.48, 0.06);
  leafParts.add(knob);
  door.add(mergeStatic(leafParts));
  root.add(door);

  // Porch lamps and string lights along the eaves (emissive, no extra light sources).
  const bulb = new MeshBasicMaterial({ color: new Color("#FFE2A8") });
  for (const side of [-1, 1]) {
    const lamp = new Mesh(track(new SphereGeometry(0.1, 12, 8)), bulb);
    lamp.position.set(side * (doorWidth / 2 + 0.3), doorHeight + 0.05, 0.2);
    root.add(lamp);
  }
  const bulbs = new InstancedMesh(track(new SphereGeometry(0.045, 8, 6)), bulb, 26);
  const dummy = new Object3D();
  for (let index = 0; index < 26; index++) {
    const t = index / 25;
    const x = -width / 2 - 0.3 + t * (width + 0.6);
    dummy.position.set(x, wallHeight + 0.02 - Math.sin(t * Math.PI * 4) ** 2 * 0.12, 0.32);
    dummy.updateMatrix();
    bulbs.setMatrixAt(index, dummy.matrix);
  }
  root.add(bulbs);

  // Flowers in the window boxes and by the step.
  const colors = ["#F4B9C3", "#FFFFFF", "#C94E5E", "#F7D6DA", "#E88C9C"];
  // Low-power phones skip the window-box roses and the leaves under the blooms.
  const perBox = lowPower ? 0 : 6;
  const perBed = lowPower ? 2 : 8;
  root.add(roseCluster([
    ...[-1, 1].flatMap((side) => Array.from({ length: perBox }, (_, index) => new Vector3(side * 1.35 - 0.36 + index * (0.72 / Math.max(perBox - 1, 1)), 1.06, 0.22))),
    ...clusterPoints(new Vector3(-1.25, 0.32, 0.75), perBed, 0.35),
    ...clusterPoints(new Vector3(1.25, 0.32, 0.75), perBed, 0.35),
  ], colors, 0.9, !lowPower));

  return { root, door, glow, focus: new Vector3() };
}

// ── Placement & culling ───────────────────────────────────────────────────────
const LANDMARK_RADIUS = 20;

// Landmarks are only drawn when the camera is near them (the fog hides them anyway beyond ~20 m).
export function cullLandmarks(landmarks: Object3D[], cameraPosition: Vector3) {
  for (const landmark of landmarks) {
    landmark.visible = landmark.position.distanceToSquared(cameraPosition) <= LANDMARK_RADIUS * LANDMARK_RADIUS;
  }
}

export function placeLandmarks(backdrop: Group, home: NewHome) {
  const start = frameAt(0);
  backdrop.position.copy(start.point).addScaledVector(start.tangent, -1.4);
  backdrop.rotation.y = Math.atan2(start.tangent.x, start.tangent.z);

  // The path ends at the porch; the house faces back toward the arriving couple.
  const end = frameAt(1);
  home.root.position.copy(end.point).addScaledVector(end.tangent, 1.1);
  home.root.rotation.y = Math.atan2(-end.tangent.x, -end.tangent.z);
  home.focus.copy(home.root.position).setY(1.6);
}
