import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// ── Botanical geometry ────────────────────────────────────────────────────────
// Flowers are built petal by petal and merged into one geometry per species, so a whole bed is a
// single instanced draw call. Vertex colours carry the petal shading (darker at the base, lighter at
// the rim) and the instance colour tints the bloom.

function paint(geometry: BufferGeometry, color: (y: number, x: number) => Color) {
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index++) {
    const value = color(positions.getY(index), positions.getX(index));
    colors.set([value.r, value.g, value.b], index * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  return geometry;
}

// A petal is a plane bent into a spoon: narrow at the base, cupped across, curled at the tip.
// 2 x 3 segments per petal: enough to read as a curved petal at phone distances, 12 triangles each.
export function petal(length: number, width: number, cup: number, curl: number, columns = 2, rows = 3) {
  const geometry = new PlaneGeometry(width, length, columns, rows);
  geometry.translate(0, length / 2, 0);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const t = y / length;                                   // 0 at the base, 1 at the tip
    const taper = Math.sin(Math.min(t, 0.98) * Math.PI) * 0.75 + 0.25 * t;
    const nx = x * taper;
    const z = cup * (nx / (width / 2)) ** 2 * width * 0.5 - curl * t * t * length;
    positions.setXYZ(index, nx, y, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function place(geometry: BufferGeometry, position: Vector3, rotation: { yaw: number; tilt: number }, scale = 1) {
  const matrix = new Matrix4().compose(
    position,
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rotation.yaw)
      .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), rotation.tilt)),
    new Vector3(scale, scale, scale),
  );
  return geometry.clone().applyMatrix4(matrix);
}

const SHADE_BASE = new Color("#B98A8F");
const SHADE_RIM = new Color("#FFFFFF");

function petalShade(length: number) {
  return (y: number) => SHADE_BASE.clone().lerp(SHADE_RIM, Math.min(Math.max(y / length, 0), 1) * 0.85 + 0.15);
}

// Garden rose: a tight bud wrapped by rings of petals that open wider toward the outside.
export function roseGeometry() {
  const parts: BufferGeometry[] = [];
  const rings = [
    { count: 3, length: 0.05, tilt: 0.25, radius: 0.004 },
    { count: 5, length: 0.062, tilt: 0.55, radius: 0.01 },
    { count: 7, length: 0.072, tilt: 0.95, radius: 0.016 },
    { count: 8, length: 0.078, tilt: 1.3, radius: 0.022 },
  ];
  rings.forEach((ring, ringIndex) => {
    const shape = paint(petal(ring.length, ring.length * 0.95, 0.7, 0.12 + ringIndex * 0.06), petalShade(ring.length));
    for (let index = 0; index < ring.count; index++) {
      const yaw = (index / ring.count) * Math.PI * 2 + ringIndex * 0.6;
      const offset = new Vector3(Math.sin(yaw) * ring.radius, 0, Math.cos(yaw) * ring.radius);
      parts.push(place(shape, offset, { yaw, tilt: ring.tilt }));
    }
  });
  return finish(parts);
}

// Cosmos / daisy: one ring of flat petals around a golden disc.
export function daisyGeometry() {
  const parts: BufferGeometry[] = [];
  const shape = paint(petal(0.07, 0.03, 0.2, -0.05), petalShade(0.07));
  for (let index = 0; index < 12; index++) {
    const yaw = (index / 12) * Math.PI * 2;
    parts.push(place(shape, new Vector3(0, 0, 0), { yaw, tilt: 1.42 }));
  }
  const disc = new SphereGeometry(0.022, 10, 6);
  disc.scale(1, 0.45, 1);
  paint(disc, () => new Color("#E3B24A").multiplyScalar(1 / 1.0));
  // The disc keeps its own colour: mark it fully saturated so the instance tint barely affects it.
  parts.push(disc);
  return finish(parts);
}

// Hydrangea: a dome of tiny four-petal florets.
export function hydrangeaGeometry() {
  const parts: BufferGeometry[] = [];
  const floret = paint(petal(0.03, 0.026, 0.15, 0, 1, 1), petalShade(0.03));
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < 20; index++) {
    const y = 1 - (index / 19) * 0.9;
    const radius = Math.sqrt(1 - y * y);
    const theta = golden * index;
    const normal = new Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
    const centre = normal.clone().multiplyScalar(0.075);
    for (let leaf = 0; leaf < 4; leaf++) {
      const piece = floret.clone();
      piece.applyMatrix4(new Matrix4().makeRotationY((leaf / 4) * Math.PI * 2));
      piece.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2 - 0.2));
      const align = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal);
      piece.applyMatrix4(new Matrix4().compose(centre, align, new Vector3(1, 1, 1)));
      parts.push(piece);
    }
  }
  return finish(parts);
}

// Leaf + stem cluster placed under every bloom.
export function foliageGeometry() {
  const parts: BufferGeometry[] = [];
  const stem = new CylinderGeometry(0.004, 0.006, 0.3, 5);
  stem.translate(0, -0.15, 0);
  parts.push(paint(stem, () => new Color("#4E7A3A")));
  const leafShape = paint(petal(0.09, 0.045, 0.35, -0.04), (y) => new Color("#3F6B2F").lerp(new Color("#7FA65A"), Math.min(y / 0.09, 1)));
  for (let index = 0; index < 4; index++) {
    const yaw = index * 1.7;
    parts.push(place(leafShape, new Vector3(0, -0.08 - index * 0.045, 0), { yaw, tilt: 1.15 }));
  }
  return finish(parts);
}

// Grass tuft: a handful of thin curved blades, merged; swayed in the vertex shader.
export function grassTuftGeometry(blades = 6) {
  const parts: BufferGeometry[] = [];
  for (let index = 0; index < blades; index++) {
    const height = 0.16 + ((index * 37) % 10) / 10 * 0.14;
    const blade = new PlaneGeometry(0.016, height, 1, 3);
    blade.translate(0, height / 2, 0);
    const positions = blade.getAttribute("position");
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const y = positions.getY(vertex);
      const t = y / height;
      positions.setX(vertex, positions.getX(vertex) * (1 - t * 0.9));
      positions.setZ(vertex, t * t * 0.05);
    }
    blade.computeVertexNormals();
    paint(blade, (y) => new Color("#557C36").lerp(new Color("#A9C774"), Math.min(y / height, 1)));
    const yaw = (index / blades) * Math.PI * 2 + index;
    const radius = 0.02 + (index % 3) * 0.015;
    parts.push(place(blade, new Vector3(Math.sin(yaw) * radius, 0, Math.cos(yaw) * radius), { yaw, tilt: 0.08 * (index % 4) }));
  }
  return finish(parts);
}

// Icosahedra come without an index, so normals would be per face (faceted, low-poly look). Welding the
// vertices first gives one shared normal per vertex: smooth, organic shading after the bumps are applied.
export function smoothSphere(radius: number, detail: number) {
  const raw = new IcosahedronGeometry(radius, detail);
  raw.deleteAttribute("normal");
  raw.deleteAttribute("uv");
  const welded = mergeVertices(raw);
  raw.dispose();
  return welded;
}

// Blossom cluster for tree canopies: lumpy sphere with pink vertex shading.
export function blossomCanopyGeometry() {
  const geometry = smoothSphere(0.9, 2);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const vertex = new Vector3().fromBufferAttribute(positions, index);
    const bump = 1 + 0.12 * Math.sin(vertex.x * 7.3) * Math.cos(vertex.y * 6.1) + 0.08 * Math.sin(vertex.z * 11.7);
    vertex.multiplyScalar(bump);
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  geometry.computeVertexNormals();
  return paint(geometry, (y) => new Color("#E9A3B3").lerp(new Color("#FFE6EC"), Math.min(Math.max((y + 0.9) / 1.8, 0), 1)));
}

function finish(parts: BufferGeometry[]) {
  // mergeGeometries needs identical attribute sets: drop uvs everywhere, keep position/normal/color.
  for (const part of parts) {
    part.deleteAttribute("uv");
    if (!part.getAttribute("color")) {
      part.setAttribute("color", new Float32BufferAttribute(new Float32Array(part.getAttribute("position").count * 3).fill(1), 3));
    }
  }
  const merged = mergeGeometries(parts.map((part) => part.index ? part.toNonIndexed() : part), false);
  parts.forEach((part) => part.dispose());
  merged.computeBoundingSphere();
  return merged;
}

// Airborne rose petal with a darker base and a translucent-looking pale rim.
export function fallingPetalGeometry() {
  return paint(petal(0.1, 0.075, 0.65, 0.24, 3, 4), (y) =>
    new Color("#C96C83").lerp(new Color("#FFE3EB"), Math.min(1, y / 0.1)));
}
