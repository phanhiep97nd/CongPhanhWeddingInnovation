import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, InstancedMesh, LatheGeometry, Vector2, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Shape, ShapeGeometry, TorusGeometry } from "three";
import { PALETTE, surface, toon } from "./materials";
import { foliageGeometry, roseGeometry } from "./flowers";
import { FONTS, loadPhoto, textCard } from "./textures";
import type { SceneData } from "./WeddingScene";

import { mergeStatic } from "./mergeStatic";
import { track } from "./resources";

// ── 囍 sign (same geometry as the Hỷ Thiệp logo) ──────────────────────────────
export function hySign(width = 0.7, gold = false) {
  const group = new Group();
  const height = width * 1.26;
  const card = new Mesh(track(new BoxGeometry(width, height, 0.04)), surface(gold ? "#C4373F" : PALETTE.son, { roughness: 0.6 }));
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
  const material = gold ? surface(PALETTE.gold, { metalness: 0.6, roughness: 0.35 }) : surface(PALETTE.paper);
  for (const [x, y, w, h] of rects) {
    const bar = new Mesh(track(new BoxGeometry(w * unit, h * unit, 0.012)), material);
    bar.position.set((x + w / 2 - 10) * unit, -(y + h / 2 - 12) * unit, 0.026);
    glyph.add(bar);
  }
  group.add(glyph);
  return mergeStatic(group);

  function box(target: number[][], x: number, y: number, w: number, h: number, s: number) {
    target.push([x, y, w, s], [x, y + h - s, w, s], [x, y, s, h], [x + w - s, y, s, h]);
  }
}

export function bench() {
  const group = new Group();
  const wood = surface(PALETTE.wood, { roughness: 0.8 });
  for (let index = 0; index < 5; index++) {
    const seat = new Mesh(track(new BoxGeometry(1.1, 0.045, 0.055)), wood);
    seat.position.set(0, 0.36, -0.14 + index * 0.07);
    group.add(seat);
  }
  for (let index = 0; index < 3; index++) {
    const back = new Mesh(track(new BoxGeometry(1.1, 0.07, 0.035)), wood);
    back.position.set(0, 0.48 + index * 0.09, -0.17);
    back.rotation.x = -0.12;
    group.add(back);
  }
  for (const x of [-0.45, 0.45]) {
    for (const z of [-0.12, 0.12]) {
      const leg = new Mesh(track(new BoxGeometry(0.055, 0.36, 0.055)), wood);
      leg.position.set(x, 0.18, z);
      group.add(leg);
    }
    const support = new Mesh(track(new BoxGeometry(0.05, 0.4, 0.04)), wood);
    support.position.set(x, 0.52, -0.18);
    group.add(support);
  }
  const sign = new Mesh(track(new ShapeGeometry(heart(0.18))), surface(PALETTE.son));
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

export function signpost(time: string, title: string) {
  const group = new Group();
  const post = new Mesh(track(new CylinderGeometry(0.035, 0.045, 1.2, 8)), surface("#886B50", { roughness: 0.8 }));
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
  const backing = new Mesh(track(new BoxGeometry(0.82, 0.47, 0.04)), surface("#886B50", { roughness: 0.8 }));
  backing.position.set(0, 1.2, 0.02);
  group.add(post, backing, board);
  return group;
}

export function photoFrame(url: string | undefined) {
  const group = new Group();
  const gold = surface(PALETTE.gold, { metalness: 0.7, roughness: 0.35 });
  const frame = new Mesh(track(new BoxGeometry(0.95, 1.2, 0.06)), gold);
  frame.position.y = 1.15;
  const material = new MeshBasicMaterial({ color: PALETTE.blush });
  const mat = new Mesh(track(new BoxGeometry(0.88, 1.13, 0.008)), surface(PALETTE.paper, { roughness: 0.8 }));
  mat.position.set(0, 1.15, 0.034);
  const photo = new Mesh(track(new PlaneGeometry(0.78, 1.01)), material);
  photo.position.set(0, 1.15, 0.04);
  if (url) {
    loadPhoto(url, (texture) => {
      // Cover-fit the photo inside the portrait frame.
      const image = texture.image as { width: number; height: number };
      const frameRatio = 0.78 / 1.01;
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
  const wood = surface("#886B50", { roughness: 0.8 });
  for (const x of [-0.32, 0.32]) {
    const leg = new Mesh(track(new BoxGeometry(0.045, 1.35, 0.045)), wood);
    leg.position.set(x, 0.65, -0.06);
    leg.rotation.z = x > 0 ? 0.13 : -0.13;
    group.add(leg);
  }
  const rear = new Mesh(track(new BoxGeometry(0.045, 1.3, 0.045)), wood);
  rear.position.set(0, 0.63, -0.29);
  rear.rotation.x = -0.35;
  const shelf = new Mesh(track(new BoxGeometry(1.02, 0.045, 0.13)), wood);
  shelf.position.set(0, 0.53, 0);
  group.add(rear, shelf, frame, mat, photo);
  return group;
}

export function flowerArch(data: SceneData, lowPower = false) {
  const group = new Group();
  const pillarMaterial = surface(PALETTE.paper, { roughness: 0.8 });
  for (const x of [-1.15, 1.15]) {
    const pillar = new Mesh(track(new CylinderGeometry(0.09, 0.11, 2.3, 12)), pillarMaterial);
    pillar.position.set(x, 1.15, 0);
    group.add(pillar);
  }
  const arch = new Mesh(track(new TorusGeometry(1.15, 0.1, 10, 40, Math.PI)), pillarMaterial);
  arch.position.y = 2.3;
  group.add(arch);
  // Garden roses and leaf clusters wrap around the timber, including both pillars.
  const count = lowPower ? 32 : 54;
  const blooms = new InstancedMesh(track(roseGeometry()), surface("#FFFFFF", { vertexColors: true, roughness: 0.55, doubleSide: true, sheen: true }), count);
  const leaves = new InstancedMesh(track(foliageGeometry()), surface("#FFFFFF", { vertexColors: true, roughness: 0.75, doubleSide: true }), count);
  const dummy = new Object3D();
  const bloomColors = [PALETTE.blush, "#FFFFFF", PALETTE.son, "#F7B9C4"];
  for (let index = 0; index < count; index++) {
    const t = index / (count - 1);
    if (t < 0.25 || t > 0.75) {
      const left = t < 0.25;
      dummy.position.set((left ? -1 : 1) * 1.15, left ? t * 9.2 : (1 - t) * 9.2, 0.09);
    } else {
      const angle = Math.PI * (1 - (t - 0.25) * 2);
      dummy.position.set(Math.cos(angle) * 1.15, 2.3 + Math.sin(angle) * 1.15, 0.09);
    }
    dummy.position.z += Math.sin(index * 2.4) * 0.08;
    dummy.rotation.set(Math.PI / 2, index * 2.4, 0);
    dummy.scale.setScalar(1.6 + (index % 3) * 0.2);
    dummy.updateMatrix();
    blooms.setMatrixAt(index, dummy.matrix);
    blooms.setColorAt(index, new Color(bloomColors[index % bloomColors.length]));
    leaves.setMatrixAt(index, dummy.matrix);
  }
  blooms.computeBoundingSphere();
  leaves.computeBoundingSphere();
  group.add(blooms, leaves);
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
  const body = new Mesh(track(new BoxGeometry(0.34, 0.46, 0.04)), surface("#C4373F", { roughness: 0.6 }));
  group.add(body);
  const seal = hySign(0.16, true);
  seal.scale.setScalar(1);
  seal.position.set(0, 0.04, 0.03);
  group.add(seal);
  return mergeStatic(group);
}

export function colourFlags(colors: string[]) {
  const group = new Group();
  const list = colors.length ? colors.slice(0, 6) : [PALETTE.blush, "#D4E0C4", PALETTE.son];
  const rope = new Mesh(track(new CylinderGeometry(0.01, 0.01, 2.4, 6)), surface("#886B50", { roughness: 0.8 }));
  rope.rotation.z = Math.PI / 2;
  rope.position.y = 1.6;
  group.add(rope);
  for (const x of [-1.2, 1.2]) {
    const pole = new Mesh(track(new CylinderGeometry(0.03, 0.04, 1.65, 8)), surface("#886B50", { roughness: 0.8 }));
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

export function lantern() {
  const group = new Group();
  const pole = new Mesh(track(new CylinderGeometry(0.03, 0.04, 1.5, 8)), surface("#886B50", { roughness: 0.8 }));
  pole.position.y = 0.75;
  const paper = surface("#C94E58", { roughness: 0.85, doubleSide: true });
  paper.emissive.set("#FF7838");
  paper.emissiveIntensity = 0.18;
  const profile = Array.from({ length: 17 }, (_, index) => {
    const t = index / 16;
    return new Vector2(0.065 + Math.sin(t * Math.PI) * 0.14, -0.25 + t * 0.5);
  });
  const lamp = new Mesh(track(new LatheGeometry(profile, 20)), paper);
  lamp.position.y = 1.55;
  group.add(pole, lamp);
  const ribs = surface("#9D3844", { roughness: 0.8 });
  for (let index = 1; index < 8; index++) {
    const t = index / 8;
    const rib = new Mesh(track(new TorusGeometry(0.066 + Math.sin(t * Math.PI) * 0.14, 0.004, 3, 20)), ribs);
    rib.rotation.x = Math.PI / 2;
    rib.position.y = 1.3 + t * 0.5;
    group.add(rib);
  }
  for (const y of [1.29, 1.81]) {
    const cap = new Mesh(track(new CylinderGeometry(0.072, 0.072, 0.04, 12)), surface(PALETTE.gold, { metalness: 0.7, roughness: 0.35 }));
    cap.position.y = y;
    group.add(cap);
  }
  return group;
}
