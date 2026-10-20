import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  Object3D,
  PlaneGeometry,
  Scene,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { PALETTE, flat, toon } from "./materials";
import { FONTS, loadPhoto, textCard } from "./textures";
import type { SceneData } from "./WeddingScene";

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
const PATH_WIDTH = 1.7;

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

const geometries: BufferGeometry[] = [];
function track<T extends BufferGeometry>(geometry: T) {
  geometries.push(geometry);
  return geometry;
}

export function disposeWorld() {
  geometries.forEach((geometry) => geometry.dispose());
  geometries.length = 0;
}

// ── Ground & path ribbon ──────────────────────────────────────────────────────
function buildGround() {
  const group = new Group();
  const grass = new Mesh(track(new PlaneGeometry(70, 80)), toon(PALETTE.grass));
  grass.rotation.x = -Math.PI / 2;
  grass.position.z = -18;
  group.add(grass);

  group.add(ribbon(PATH_WIDTH, 0.006, PALETTE.path));
  group.add(ribbon(PATH_WIDTH + 0.22, 0.004, PALETTE.pathEdge));
  return group;
}

function ribbon(width: number, height: number, color: string) {
  const segments = 260;
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const indices: number[] = [];
  for (let index = 0; index <= segments; index++) {
    const { point, side } = frameAt(index / segments);
    const left = point.clone().addScaledVector(side, width / 2);
    const right = point.clone().addScaledVector(side, -width / 2);
    positions.set([left.x, height, left.z, right.x, height, right.z], index * 6);
    if (index < segments) {
      const a = index * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = track(new BufferGeometry());
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new Mesh(geometry, toon(color));
}

// ── Flowers, bushes, trees (instanced) ────────────────────────────────────────
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function buildPlanting() {
  const group = new Group();
  const random = seeded(7);
  const dummy = new Object3D();
  const flowerColors = [PALETTE.blush, "#FFFFFF", PALETTE.son, "#F7B9C4", PALETTE.gold, "#D9C6EC"].map((color) => new Color(color));

  const flowerCount = 520;
  const flowers = new InstancedMesh(track(new IcosahedronGeometry(0.075, 1)), new MeshToonMaterial({ color: "#FFFFFF" }), flowerCount);
  for (let index = 0; index < flowerCount; index++) {
    const u = random();
    const { point, side } = frameAt(u);
    const offset = (PATH_WIDTH / 2 + 0.15 + random() * 0.9) * (random() > 0.5 ? 1 : -1);
    dummy.position.copy(point).addScaledVector(side, offset);
    dummy.position.y = 0.08 + random() * 0.12;
    dummy.scale.setScalar(0.7 + random() * 0.7);
    dummy.updateMatrix();
    flowers.setMatrixAt(index, dummy.matrix);
    flowers.setColorAt(index, flowerColors[Math.floor(random() * flowerColors.length)]);
  }
  group.add(flowers);

  const bushCount = 170;
  const bushes = new InstancedMesh(track(new IcosahedronGeometry(0.32, 1)), toon(PALETTE.leaf), bushCount);
  for (let index = 0; index < bushCount; index++) {
    const { point, side } = frameAt(random());
    const offset = (PATH_WIDTH / 2 + 0.9 + random() * 1.8) * (random() > 0.5 ? 1 : -1);
    dummy.position.copy(point).addScaledVector(side, offset);
    dummy.position.y = 0.12;
    dummy.scale.set(0.8 + random() * 0.8, 0.55 + random() * 0.5, 0.8 + random() * 0.8);
    dummy.updateMatrix();
    bushes.setMatrixAt(index, dummy.matrix);
  }
  group.add(bushes);

  // Blossom trees further out: trunks + pink canopies.
  const treeCount = 34;
  const trunks = new InstancedMesh(track(new CylinderGeometry(0.08, 0.12, 1.4, 8)), toon(PALETTE.wood), treeCount);
  const canopies = new InstancedMesh(track(new IcosahedronGeometry(0.9, 1)), new MeshToonMaterial({ color: "#FFFFFF" }), treeCount * 2);
  const blossom = [new Color("#F6C9D2"), new Color("#F9DDE3"), new Color("#EFB3C0")];
  for (let index = 0; index < treeCount; index++) {
    const { point, side } = frameAt(index / treeCount + random() * 0.02);
    const offset = (4 + random() * 4) * (index % 2 === 0 ? 1 : -1);
    const base = point.clone().addScaledVector(side, offset);
    dummy.position.set(base.x, 0.7, base.z);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    trunks.setMatrixAt(index, dummy.matrix);
    for (let layer = 0; layer < 2; layer++) {
      dummy.position.set(base.x + (random() - 0.5) * 0.5, 1.7 + layer * 0.55, base.z + (random() - 0.5) * 0.5);
      dummy.scale.setScalar(1 - layer * 0.3 + random() * 0.2);
      dummy.updateMatrix();
      canopies.setMatrixAt(index * 2 + layer, dummy.matrix);
      canopies.setColorAt(index * 2 + layer, blossom[Math.floor(random() * blossom.length)]);
    }
  }
  group.add(trunks, canopies);
  return group;
}

// ── Falling petals ────────────────────────────────────────────────────────────
export class Petals {
  readonly mesh: InstancedMesh;
  private readonly items: { position: Vector3; speed: number; spin: Vector3; phase: number }[] = [];
  private readonly dummy = new Object3D();
  private readonly random = seeded(11);

  constructor(count: number) {
    const shape = new Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.05, 0.04, 0, 0.1);
    shape.quadraticCurveTo(-0.05, 0.04, 0, 0);
    this.mesh = new InstancedMesh(track(new ShapeGeometry(shape)), new MeshBasicMaterial({ color: "#F4B6C2", side: DoubleSide, transparent: true, opacity: 0.9 }), count);
    for (let index = 0; index < count; index++) {
      this.items.push({
        position: new Vector3((this.random() - 0.5) * 8, this.random() * 5, (this.random() - 0.5) * 8),
        speed: 0.25 + this.random() * 0.35,
        spin: new Vector3(this.random(), this.random(), this.random()).multiplyScalar(2),
        phase: this.random() * Math.PI * 2,
      });
    }
    this.mesh.frustumCulled = false;
  }

  // Petals live in a box that follows the camera target, wrapping vertically.
  update(dt: number, time: number, centre: Vector3) {
    this.items.forEach((item, index) => {
      item.position.y -= item.speed * dt;
      if (item.position.y < 0) item.position.y += 5;
      const x = centre.x + item.position.x + Math.sin(time * 0.8 + item.phase) * 0.4;
      const z = centre.z + item.position.z;
      this.dummy.position.set(x, item.position.y, z);
      this.dummy.rotation.set(time * item.spin.x, time * item.spin.y, time * item.spin.z);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(index, this.dummy.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ── 囍 sign (same geometry as the Hỷ Thiệp logo) ──────────────────────────────
export function hySign(width = 0.7) {
  const group = new Group();
  const height = width * 1.26;
  const card = new Mesh(track(new BoxGeometry(width, height, 0.04)), toon(PALETTE.son));
  group.add(card);
  const glyph = new Group();
  const stroke = 1.55;
  const rects: number[][] = [[0, 0, 20, stroke]];
  for (const x of [0, 11]) rects.push([x + 4.5 - stroke / 2, stroke, stroke, 3]);
  rects.push([-1, 5, 22, stroke]);
  for (const x of [0, 11]) box(rects, x + 1, 8.5, 7, 5, stroke);
  rects.push([-1, 16.6, 22, stroke]);
  for (const x of [0, 11]) box(rects, x + 1, 19.4, 7, 4.6, stroke);
  const unit = (width * 0.62) / 22;
  const material = toon(PALETTE.paper);
  for (const [x, y, w, h] of rects) {
    const bar = new Mesh(track(new BoxGeometry(w * unit, h * unit, 0.012)), material);
    bar.position.set((x + w / 2 - 10) * unit, -(y + h / 2 - 12) * unit, 0.026);
    glyph.add(bar);
  }
  group.add(glyph);
  return group;

  function box(target: number[][], x: number, y: number, w: number, h: number, s: number) {
    target.push([x, y, w, s], [x, y + h - s, w, s], [x, y, s, h], [x + w - s, y, s, h]);
  }
}

// ── Stations ──────────────────────────────────────────────────────────────────
export interface Station {
  key: string;
  u: number;
  side: number;          // +1 left of the walker, -1 right
  focus: Vector3;        // what the couple looks at
  object: Group;
}

function placeBeside(object: Object3D, u: number, sideSign: number, distance: number) {
  const { point, side, tangent } = frameAt(u);
  object.position.copy(point).addScaledVector(side, sideSign * distance);
  object.quaternion.setFromRotationMatrix(new Matrix4().lookAt(new Vector3(), tangent.clone().negate().addScaledVector(side, sideSign * 0.9), up));
}

function bench() {
  const group = new Group();
  const wood = toon(PALETTE.wood);
  const seat = new Mesh(track(new BoxGeometry(1.1, 0.06, 0.34)), wood);
  seat.position.y = 0.36;
  const back = new Mesh(track(new BoxGeometry(1.1, 0.3, 0.05)), wood);
  back.position.set(0, 0.58, -0.15);
  group.add(seat, back);
  for (const x of [-0.45, 0.45]) {
    const leg = new Mesh(track(new BoxGeometry(0.06, 0.36, 0.3)), toon("#7C5440"));
    leg.position.set(x, 0.18, 0);
    group.add(leg);
  }
  const heartShape = heart(0.18);
  const sign = new Mesh(track(new ShapeGeometry(heartShape)), flat(PALETTE.son));
  sign.position.set(0, 0.95, -0.15);
  group.add(sign);
  return group;
}

export function heart(size: number) {
  const shape = new Shape();
  const s = size;
  shape.moveTo(0, -s * 0.9);
  shape.bezierCurveTo(-s * 1.4, -s * 0.1, -s * 0.7, s * 0.9, 0, s * 0.35);
  shape.bezierCurveTo(s * 0.7, s * 0.9, s * 1.4, -s * 0.1, 0, -s * 0.9);
  return shape;
}

function signpost(time: string, title: string) {
  const group = new Group();
  const post = new Mesh(track(new CylinderGeometry(0.035, 0.045, 1.2, 8)), toon(PALETTE.wood));
  post.position.y = 0.6;
  const texture = textCard(
    [
      { text: time, font: FONTS.serif, weight: 600, color: PALETTE.son, size: 64, gap: 4 },
      { text: title, font: FONTS.sans, weight: 500, color: PALETTE.moss, size: 30 },
    ],
    { width: 360, height: 200, background: PALETTE.paper, border: PALETTE.blush },
  );
  const board = new Mesh(track(new PlaneGeometry(0.78, 0.43)), new MeshBasicMaterial({ map: texture, transparent: true }));
  board.position.set(0, 1.2, 0.05);
  const backing = new Mesh(track(new BoxGeometry(0.82, 0.47, 0.04)), toon(PALETTE.wood));
  backing.position.set(0, 1.2, 0.02);
  group.add(post, backing, board);
  return group;
}

function photoFrame(url: string | undefined) {
  const group = new Group();
  const gold = toon(PALETTE.gold);
  const frame = new Mesh(track(new BoxGeometry(0.95, 1.2, 0.06)), gold);
  frame.position.y = 1.15;
  const material = new MeshBasicMaterial({ color: PALETTE.blush });
  const photo = new Mesh(track(new PlaneGeometry(0.82, 1.06)), material);
  photo.position.set(0, 1.15, 0.035);
  if (url) {
    loadPhoto(url, (texture) => {
      // Cover-fit the photo inside the portrait frame.
      const image = texture.image as { width: number; height: number };
      const frameRatio = 0.82 / 1.06;
      const imageRatio = image.width / image.height;
      if (imageRatio > frameRatio) {
        texture.repeat.set(frameRatio / imageRatio, 1);
        texture.offset.set((1 - texture.repeat.x) / 2, 0);
      } else {
        texture.repeat.set(1, imageRatio / frameRatio);
        texture.offset.set(0, (1 - texture.repeat.y) / 2);
      }
      material.map = texture;
      material.color.set("#FFFFFF");
      material.needsUpdate = true;
    });
  }
  const easel = new Mesh(track(new BoxGeometry(0.06, 1.2, 0.06)), toon(PALETTE.wood));
  easel.position.set(0, 0.5, -0.12);
  easel.rotation.x = 0.18;
  group.add(easel, frame, photo);
  return group;
}

function flowerArch(data: SceneData) {
  const group = new Group();
  const pillarMaterial = toon(PALETTE.paper);
  for (const x of [-1.15, 1.15]) {
    const pillar = new Mesh(track(new CylinderGeometry(0.09, 0.11, 2.3, 12)), pillarMaterial);
    pillar.position.set(x, 1.15, 0);
    group.add(pillar);
  }
  const arch = new Mesh(track(new TorusGeometry(1.15, 0.1, 10, 40, Math.PI)), pillarMaterial);
  arch.position.y = 2.3;
  group.add(arch);
  // Flowers climbing the arch.
  const bloomColors = [PALETTE.blush, "#FFFFFF", PALETTE.son, "#F7B9C4"];
  for (let index = 0; index <= 26; index++) {
    const angle = (index / 26) * Math.PI;
    const bloom = new Mesh(track(new SphereGeometry(0.11 + (index % 3) * 0.02, 10, 8)), toon(bloomColors[index % bloomColors.length]));
    bloom.position.set(Math.cos(angle) * 1.15, 2.3 + Math.sin(angle) * 1.15, 0.05);
    group.add(bloom);
  }
  for (const x of [-1.15, 1.15]) {
    for (let index = 0; index < 6; index++) {
      const bloom = new Mesh(track(new SphereGeometry(0.1, 10, 8)), toon(bloomColors[(index + 1) % bloomColors.length]));
      bloom.position.set(x + (index % 2 ? 0.08 : -0.08), 0.4 + index * 0.33, 0.08);
      group.add(bloom);
    }
  }
  const sign = hySign(0.62);
  sign.position.set(0, 2.62, 0.05);
  group.add(sign);
  const venue = textCard(
    [
      { text: data.venueName || "Ngày vui", font: FONTS.serif, weight: 600, color: PALETTE.son, size: 56, gap: 2 },
      { text: data.dateText, font: FONTS.sans, weight: 500, color: PALETTE.moss, size: 30 },
    ],
    { width: 520, height: 180, background: PALETTE.paper, border: PALETTE.gold },
  );
  const board = new Mesh(track(new PlaneGeometry(1.5, 0.52)), new MeshBasicMaterial({ map: venue, transparent: true }));
  board.position.set(0, 1.62, 0.1);
  group.add(board);
  return group;
}

export function redEnvelope() {
  const group = new Group();
  const body = new Mesh(track(new BoxGeometry(0.34, 0.46, 0.04)), toon("#C4373F"));
  group.add(body);
  const seal = hySign(0.16);
  seal.scale.setScalar(1);
  seal.position.set(0, 0.04, 0.03);
  (seal.children[0] as Mesh).material = toon(PALETTE.gold);
  group.add(seal);
  return group;
}

function colourFlags(colors: string[]) {
  const group = new Group();
  const list = colors.length ? colors.slice(0, 6) : [PALETTE.blush, "#D4E0C4", PALETTE.son];
  const rope = new Mesh(track(new CylinderGeometry(0.01, 0.01, 2.4, 6)), toon(PALETTE.wood));
  rope.rotation.z = Math.PI / 2;
  rope.position.y = 1.6;
  group.add(rope);
  for (const x of [-1.2, 1.2]) {
    const pole = new Mesh(track(new CylinderGeometry(0.03, 0.04, 1.65, 8)), toon(PALETTE.wood));
    pole.position.set(x, 0.82, 0);
    group.add(pole);
  }
  list.forEach((color, index) => {
    const flag = new Mesh(track(new ConeGeometry(0.15, 0.32, 3)), toon(color));
    flag.rotation.z = Math.PI;
    flag.position.set(-0.9 + (index * 1.8) / Math.max(list.length - 1, 1), 1.43, 0);
    group.add(flag);
  });
  return group;
}

function lantern() {
  const group = new Group();
  const pole = new Mesh(track(new CylinderGeometry(0.03, 0.04, 1.5, 8)), toon(PALETTE.wood));
  pole.position.y = 0.75;
  const lamp = new Mesh(track(new SphereGeometry(0.2, 14, 10)), toon("#E8545E"));
  lamp.scale.y = 1.25;
  lamp.position.y = 1.55;
  const cap = new Mesh(track(new CylinderGeometry(0.08, 0.08, 0.06, 10)), toon(PALETTE.gold));
  cap.position.y = 1.82;
  group.add(pole, lamp, cap);
  return group;
}

export function buildStations(data: SceneData): Station[] {
  const positions = stationPositions(data.stations.length);
  return data.stations.map((key, index) => {
    const u = positions[index];
    const sideSign = index % 2 === 0 ? 1 : -1;
    const object = new Group();
    const focus = new Vector3();

    if (key === "story") {
      const prop = bench();
      placeBeside(prop, u - 0.012, sideSign, 1.5);
      object.add(prop);
    } else if (key === "timeline") {
      const items = data.timeline.length ? data.timeline.slice(0, 5) : [{ time: data.dateText, title: "Ngày cưới" }];
      items.forEach((item, itemIndex) => {
        const post = signpost(item.time, item.title);
        placeBeside(post, u - 0.006 - itemIndex * 0.011, itemIndex % 2 === 0 ? sideSign : -sideSign, 1.55);
        object.add(post);
      });
    } else if (key === "gallery") {
      const photos = data.photos.length ? data.photos.slice(0, 6) : [undefined, undefined];
      photos.forEach((url, photoIndex) => {
        const frame = photoFrame(url);
        placeBeside(frame, u - 0.004 - photoIndex * 0.01, photoIndex % 2 === 0 ? 1 : -1, 1.6);
        object.add(frame);
      });
    } else if (key === "info") {
      const arch = flowerArch(data);
      const { point, tangent } = frameAt(u - 0.016);
      arch.position.copy(point);
      // Face forward: the camera waits ahead of the couple, looking back at them and the gate.
      arch.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), tangent.clone());
      object.add(arch);
    } else if (key === "giftBox") {
      const envelope = redEnvelope();
      placeBeside(envelope, u - 0.008, sideSign, 1.2);
      envelope.position.y = 1.1;
      envelope.userData.float = true;
      object.add(envelope);
    } else if (key === "dressCode") {
      const flags = colourFlags(data.colors);
      placeBeside(flags, u - 0.012, sideSign, 1.5);
      object.add(flags);
    } else {
      const prop = lantern();
      placeBeside(prop, u - 0.01, sideSign, 1.3);
      object.add(prop);
    }

    const anchor = object.children[0];
    if (anchor) focus.copy(anchor.position).setY(1);
    return { key, u, side: sideSign, focus, object };
  });
}

export function buildWorld(scene: Scene, data: SceneData) {
  const ground = buildGround();
  const planting = buildPlanting();
  const stations = buildStations(data);
  scene.add(ground, planting);
  stations.forEach((station) => scene.add(station.object));
  return { stations };
}

// Small helper for gentle bobbing of floating props.
export function floatProps(stations: Station[], time: number) {
  for (const station of stations) {
    station.object.traverse((child) => {
      if (child.userData.float) {
        child.position.y = 1.1 + Math.sin(time * 1.6) * 0.06;
        child.rotation.y = Math.sin(time * 0.8) * 0.4;
      }
    });
  }
}

