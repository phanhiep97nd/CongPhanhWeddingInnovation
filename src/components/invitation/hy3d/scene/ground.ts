import { BackSide, BufferAttribute, BufferGeometry, CanvasTexture, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, ShaderMaterial, SphereGeometry, SRGBColorSpace, Texture } from "three";
import { PALETTE, flat, surface } from "./materials";

import type { SceneData } from "./WeddingScene";

import { PATH_WIDTH, frameAt } from "./path";
import { track, seeded } from "./resources";

// ── Ground, flagstone path, sky ───────────────────────────────────────────────
export function buildGround(lowPower: boolean) {
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

