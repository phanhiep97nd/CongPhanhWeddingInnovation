import {
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
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
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TorusGeometry,
  Vector3,
} from "three";
import { PALETTE, flat, surface, toon, withWind } from "./materials";
import { blossomCanopyGeometry, daisyGeometry, foliageGeometry, grassTuftGeometry, hydrangeaGeometry, roseGeometry } from "./flowers";
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

// ── Ground, flagstone path, sky ───────────────────────────────────────────────
function buildGround(lowPower: boolean) {
  const group = new Group();

  // Meadow: a subdivided plane with gentle colour variation baked into vertex colours.
  const meadow = track(new PlaneGeometry(70, 80, lowPower ? 40 : 80, lowPower ? 45 : 90));
  meadow.rotateX(-Math.PI / 2);
  const positions = meadow.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  const light = new Color("#9BBE72");
  const deep = new Color("#6E9550");
  const dry = new Color("#B8C27E");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const patch = 0.5 + 0.5 * Math.sin(x * 0.37 + Math.sin(z * 0.21) * 2) * Math.cos(z * 0.29);
    const speck = 0.5 + 0.5 * Math.sin(x * 2.7 + z * 3.1);
    const color = deep.clone().lerp(light, patch).lerp(dry, speck * 0.18);
    colors.set([color.r, color.g, color.b], index * 3);
  }
  meadow.setAttribute("color", new BufferAttribute(colors, 3));
  const ground = new Mesh(meadow, surface("#FFFFFF", { vertexColors: true, roughness: 1 }));
  ground.position.z = -18;
  ground.receiveShadow = true;
  group.add(ground);

  const path = ribbon(PATH_WIDTH, 0.008, flagstoneTexture());
  path.receiveShadow = true;
  group.add(path);
  const border = ribbon(PATH_WIDTH + 0.28, 0.004);
  (border.material as MeshStandardMaterial).color.set("#8E7A63");
  border.receiveShadow = true;
  group.add(border);

  group.add(sky());
  group.add(distantHills());
  return group;
}

// Low rolling hills and a blurred tree line on the horizon so the meadow does not end in a flat edge.
function distantHills() {
  const group = new Group();
  const ridge = (radius: number, height: number, color: string, seed: number) => {
    const segments = 96;
    const positions: number[] = [];
    const indices: number[] = [];
    const random = seeded(seed);
    const phase = random() * 10;
    for (let index = 0; index <= segments; index++) {
      const angle = (index / segments) * Math.PI * 2;
      const lift = height * (0.55 + 0.45 * Math.sin(angle * 3 + phase) * Math.sin(angle * 5.3 + phase * 0.7)) + random() * height * 0.08;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 18;
      positions.push(x, -0.5, z, x, lift, z);
      if (index < segments) {
        const base = index * 2;
        indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      }
    }
    const geometry = track(new BufferGeometry());
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new Mesh(geometry, new MeshBasicMaterial({ color, side: DoubleSide, fog: true }));
  };
  group.add(ridge(46, 4.2, "#C7D5B0", 3), ridge(40, 2.6, "#AFC598", 5));
  return group;
}

// Path ribbon with UVs running along the walk so the flagstone texture tiles naturally.
function ribbon(width: number, height: number, texture?: Texture) {
  const segments = 320;
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices: number[] = [];
  let travelled = 0;
  let previous = frameAt(0).point;
  for (let index = 0; index <= segments; index++) {
    const { point, side } = frameAt(index / segments);
    travelled += point.distanceTo(previous);
    previous = point;
    const left = point.clone().addScaledVector(side, width / 2);
    const right = point.clone().addScaledVector(side, -width / 2);
    positions.set([left.x, height, left.z, right.x, height, right.z], index * 6);
    uvs.set([0, travelled / width, 1, travelled / width], index * 4);
    if (index < segments) {
      const a = index * 2;
      // Counter-clockwise seen from above, so the normals point up and the top face is drawn.
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = track(new BufferGeometry());
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new MeshStandardMaterial({ color: texture ? "#FFFFFF" : PALETTE.pathEdge, map: texture ?? null, roughness: 0.92 });
  return new Mesh(geometry, material);
}

// Irregular flagstones in warm limestone tones, painted once on a canvas.
function flagstoneTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#8E7A63";
  context.fillRect(0, 0, size, size);
  const random = seeded(23);
  const tones = ["#E3D3C3", "#D8C4B1", "#EADDCF", "#CDB7A3", "#DDCAB6"];
  const rows = 4;
  for (let row = 0; row < rows; row++) {
    let x = row % 2 ? -40 : 0;
    const y = (row / rows) * size;
    while (x < size) {
      const width = 90 + random() * 80;
      const height = size / rows;
      context.fillStyle = tones[Math.floor(random() * tones.length)];
      context.beginPath();
      const inset = 6;
      const jitter = () => (random() - 0.5) * 10;
      context.moveTo(x + inset + jitter(), y + inset + jitter());
      context.lineTo(x + width - inset + jitter(), y + inset + jitter());
      context.lineTo(x + width - inset + jitter(), y + height - inset + jitter());
      context.lineTo(x + inset + jitter(), y + height - inset + jitter());
      context.closePath();
      context.fill();
      // Subtle grain so the stone does not read as flat colour.
      for (let dot = 0; dot < 90; dot++) {
        context.fillStyle = `rgba(90, 70, 55, ${0.04 + random() * 0.06})`;
        context.fillRect(x + random() * width, y + random() * height, 2 + random() * 3, 2 + random() * 3);
      }
      x += width;
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Soft gradient sky dome: blush overhead, warm paper at the horizon (matches the fog colour).
function sky() {
  const geometry = track(new SphereGeometry(60, 24, 16));
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new Color(PALETTE.skyTop) },
      horizon: { value: new Color(PALETTE.skyHorizon) },
    },
    vertexShader: "varying vec3 vWorld; void main() { vWorld = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 horizon; varying vec3 vWorld; void main() { float h = clamp(normalize(vWorld - cameraPosition).y * 1.6, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, h), 1.0); }",
  });
  const dome = new Mesh(geometry, material);
  dome.frustumCulled = false;
  dome.onBeforeRender = (_renderer, _scene, camera) => dome.position.copy(camera.position);
  return dome;
}

// ── Flower beds, grass, shrubs, blossom trees (instanced) ─────────────────────
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function buildPlanting(lowPower: boolean) {
  const group = new Group();
  const random = seeded(7);
  const dummy = new Object3D();
  const scale = lowPower ? 0.55 : 1;

  // Blooms of three species share one foliage mesh (stem + leaves) placed under each head.
  const species = [
    { geometry: roseGeometry(), count: Math.round(260 * scale), colors: ["#F4B9C3", "#FFFFFF", "#C94E5E", "#F7D6DA", "#E88C9C"], size: [0.9, 1.35] },
    { geometry: daisyGeometry(), count: Math.round(180 * scale), colors: ["#FFFFFF", "#F8E7EF", "#F3D2E2"], size: [0.8, 1.15] },
    { geometry: hydrangeaGeometry(), count: Math.round(70 * scale), colors: ["#D9C6EC", "#C9D8F2", "#F5D0DE"], size: [0.9, 1.2] },
  ];
  const foliage = track(foliageGeometry());
  const foliageCount = species.reduce((sum, item) => sum + item.count, 0);
  const leaves = new InstancedMesh(foliage, withWind(surface("#FFFFFF", { vertexColors: true, roughness: 0.75, doubleSide: true }), 0.3, 0.02), foliageCount);
  let leafIndex = 0;

  for (const item of species) {
    track(item.geometry);
    const material = withWind(surface("#FFFFFF", { vertexColors: true, roughness: 0.55, doubleSide: true, sheen: true }), 0.35, 0.02);
    const blooms = new InstancedMesh(item.geometry, material, item.count);
    for (let index = 0; index < item.count; index++) {
      const { point, side } = frameAt(random());
      const offset = (PATH_WIDTH / 2 + 0.22 + random() * 1.0) * (random() > 0.5 ? 1 : -1);
      const size = item.size[0] + random() * (item.size[1] - item.size[0]);
      dummy.position.copy(point).addScaledVector(side, offset);
      dummy.position.y = 0.22 + random() * 0.16;
      dummy.rotation.set((random() - 0.5) * 0.5, random() * Math.PI * 2, (random() - 0.5) * 0.5);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      blooms.setMatrixAt(index, dummy.matrix);
      blooms.setColorAt(index, new Color(item.colors[Math.floor(random() * item.colors.length)]));
      leaves.setMatrixAt(leafIndex++, dummy.matrix);
    }
    // Flowers are too small to need shadow-map casters; skipping them halves the shadow pass.
    group.add(blooms);
  }
  group.add(leaves);

  // Grass tufts along the path edges and scattered in the meadow, swaying in the wind.
  const tuftCount = Math.round(1600 * scale);
  const grass = new InstancedMesh(track(grassTuftGeometry()), withWind(surface("#FFFFFF", { vertexColors: true, roughness: 0.9, doubleSide: true }), 0.3, 0.05), tuftCount);
  for (let index = 0; index < tuftCount; index++) {
    const { point, side } = frameAt(random());
    const edge = index % 3 !== 0;
    const offset = edge
      ? (PATH_WIDTH / 2 + 0.1 + random() * 0.6) * (random() > 0.5 ? 1 : -1)
      : (PATH_WIDTH / 2 + 1 + random() * 6) * (random() > 0.5 ? 1 : -1);
    dummy.position.copy(point).addScaledVector(side, offset);
    dummy.position.y = 0;
    dummy.rotation.set(0, random() * Math.PI * 2, 0);
    dummy.scale.setScalar(0.8 + random() * 0.9);
    dummy.updateMatrix();
    grass.setMatrixAt(index, dummy.matrix);
  }
  group.add(grass);

  // Boxwood shrubs: lumpy, slightly glossy evergreen balls.
  const shrubCount = Math.round(120 * scale);
  const shrubGeometry = track(new IcosahedronGeometry(0.34, 2));
  const shrubPositions = shrubGeometry.getAttribute("position");
  for (let index = 0; index < shrubPositions.count; index++) {
    const vertex = new Vector3().fromBufferAttribute(shrubPositions, index);
    vertex.multiplyScalar(1 + 0.1 * Math.sin(vertex.x * 19) * Math.cos(vertex.y * 17) + 0.06 * Math.sin(vertex.z * 23));
    shrubPositions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  shrubGeometry.computeVertexNormals();
  const shrubs = new InstancedMesh(shrubGeometry, surface("#4F7A3A", { roughness: 0.62 }), shrubCount);
  for (let index = 0; index < shrubCount; index++) {
    const { point, side } = frameAt(random());
    const offset = (PATH_WIDTH / 2 + 1.3 + random() * 1.8) * (random() > 0.5 ? 1 : -1);
    dummy.position.copy(point).addScaledVector(side, offset);
    dummy.position.y = 0.18;
    dummy.rotation.set(0, random() * Math.PI, 0);
    dummy.scale.set(0.9 + random() * 0.8, 0.7 + random() * 0.5, 0.9 + random() * 0.8);
    dummy.updateMatrix();
    shrubs.setMatrixAt(index, dummy.matrix);
  }
  shrubs.castShadow = !lowPower;
  shrubs.receiveShadow = true;
  group.add(shrubs);

  group.add(blossomTrees(random, lowPower));
  return group;
}

// Cherry-blossom trees: a tapered trunk with two forked branches carrying blossom clusters.
function blossomTrees(random: () => number, lowPower: boolean) {
  const group = new Group();
  const treeCount = lowPower ? 18 : 30;
  const trunkGeometry = track(new CylinderGeometry(0.07, 0.16, 1.6, 8));
  trunkGeometry.translate(0, 0.8, 0);
  const branchGeometry = track(new CylinderGeometry(0.035, 0.07, 1.1, 6));
  branchGeometry.translate(0, 0.55, 0);
  const canopyGeometry = track(blossomCanopyGeometry());
  const trunks = new InstancedMesh(trunkGeometry, surface("#5C4033", { roughness: 0.95 }), treeCount);
  const branches = new InstancedMesh(branchGeometry, surface("#5C4033", { roughness: 0.95 }), treeCount * 2);
  const canopies = new InstancedMesh(canopyGeometry, surface("#FFFFFF", { vertexColors: true, roughness: 0.8 }), treeCount * 3);
  const dummy = new Object3D();
  const tint = [new Color("#FFFFFF"), new Color("#FFE9EE"), new Color("#F6D4DC")];

  for (let tree = 0; tree < treeCount; tree++) {
    const { point, side } = frameAt(tree / treeCount + random() * 0.02);
    const base = point.clone().addScaledVector(side, (4 + random() * 4) * (tree % 2 === 0 ? 1 : -1));
    const height = 0.9 + random() * 0.4;
    dummy.position.copy(base);
    dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.1);
    dummy.scale.set(1, height, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(tree, dummy.matrix);

    for (let fork = 0; fork < 2; fork++) {
      const lean = (fork === 0 ? 1 : -1) * (0.5 + random() * 0.3);
      const yaw = random() * Math.PI * 2;
      dummy.position.set(base.x, 1.45 * height, base.z);
      dummy.rotation.set(0, yaw, lean);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      branches.setMatrixAt(tree * 2 + fork, dummy.matrix);
    }
    for (let cluster = 0; cluster < 3; cluster++) {
      const angle = (cluster / 3) * Math.PI * 2 + random();
      dummy.position.set(base.x + Math.cos(angle) * 0.6, 2.3 * height + random() * 0.4, base.z + Math.sin(angle) * 0.6);
      dummy.rotation.set(random(), random() * Math.PI, random());
      dummy.scale.setScalar(0.8 + random() * 0.45);
      dummy.updateMatrix();
      canopies.setMatrixAt(tree * 3 + cluster, dummy.matrix);
      canopies.setColorAt(tree * 3 + cluster, tint[Math.floor(random() * tint.length)]);
    }
  }
  trunks.castShadow = !lowPower;
  canopies.castShadow = !lowPower;
  group.add(trunks, branches, canopies);
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

export function buildWorld(scene: Scene, data: SceneData, lowPower = false) {
  const ground = buildGround(lowPower);
  const planting = buildPlanting(lowPower);
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

