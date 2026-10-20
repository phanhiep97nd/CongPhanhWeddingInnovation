import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Color, CylinderGeometry, Group, IcosahedronGeometry, InstancedMesh, Object3D, Vector3 } from "three";
import { surface, withWind } from "./materials";
import { blossomCanopyGeometry, daisyGeometry, foliageGeometry, grassTuftGeometry, hydrangeaGeometry, roseGeometry, smoothSphere } from "./flowers";

import { PATH_WIDTH, frameAt } from "./path";
import { track, seeded } from "./resources";
import { chunkInstances, plantingChunkCount } from "./chunkInstances";

export function buildPlanting(lowPower: boolean) {
  const group = new Group();
  const random = seeded(7);
  const dummy = new Object3D();
  // Dense beds along the path; far chunks are culled, so density costs little on screen.
  const scale = lowPower ? 0.45 : 0.85;

  // Blooms of three species share one foliage mesh (stem + leaves) placed under each head.
  const species = [
    { geometry: roseGeometry(), count: Math.round(180 * scale), colors: ["#F4B9C3", "#FFFFFF", "#C94E5E", "#F7D6DA", "#E88C9C"], size: [0.9, 1.35] },
    { geometry: daisyGeometry(), count: Math.round(120 * scale), colors: ["#FFFFFF", "#F8E7EF", "#F3D2E2"], size: [0.8, 1.15] },
    { geometry: hydrangeaGeometry(), count: Math.round(50 * scale), colors: ["#D9C6EC", "#C9D8F2", "#F5D0DE"], size: [0.9, 1.2] },
  ];
  const foliage = track(foliageGeometry());
  const foliageCount = species.reduce((sum, item) => sum + item.count, 0);
  const leaves = new InstancedMesh(foliage, withWind(surface("#FFFFFF", { vertexColors: true, roughness: 0.75, doubleSide: true }), 0.3, 0.02), foliageCount);
  let leafIndex = 0;
  const leafU: number[] = [];

  for (const item of species) {
    track(item.geometry);
    const material = withWind(surface("#FFFFFF", { vertexColors: true, roughness: 0.55, doubleSide: true, sheen: true }), 0.35, 0.02);
    const blooms = new InstancedMesh(item.geometry, material, item.count);
    const parameters: number[] = [];
    for (let index = 0; index < item.count; index++) {
      const u = (index + random() * 0.8) / item.count;
      parameters.push(u);
      leafU.push(u);
      const { point, side } = frameAt(u);
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
    blooms.name = "blooms";
    group.add(chunkInstances(blooms, parameters, plantingChunkCount(lowPower)));
  }
  leaves.name = "foliage";
  group.add(chunkInstances(leaves, leafU, plantingChunkCount(lowPower)));

  // Grass tufts along the path edges and scattered in the meadow, swaying in the wind.
  const tuftCount = Math.round(900 * scale);
  const grass = new InstancedMesh(track(grassTuftGeometry(4)), withWind(surface("#FFFFFF", { vertexColors: true, roughness: 0.9, doubleSide: true }), 0.3, 0.05), tuftCount);
  const grassU: number[] = [];
  for (let index = 0; index < tuftCount; index++) {
    const u = (index + random() * 0.8) / tuftCount;
    grassU.push(u);
    const { point, side } = frameAt(u);
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
  grass.name = "grass";
  group.add(chunkInstances(grass, grassU, plantingChunkCount(lowPower)));

  // Boxwood shrubs: lumpy, slightly glossy evergreen balls.
  const shrubCount = Math.round(64 * scale);
  const shrubGeometry = track(smoothSphere(0.34, 2));
  const shrubPositions = shrubGeometry.getAttribute("position");
  for (let index = 0; index < shrubPositions.count; index++) {
    const vertex = new Vector3().fromBufferAttribute(shrubPositions, index);
    vertex.multiplyScalar(1 + 0.1 * Math.sin(vertex.x * 19) * Math.cos(vertex.y * 17) + 0.06 * Math.sin(vertex.z * 23));
    shrubPositions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  shrubGeometry.computeVertexNormals();
  const shrubs = new InstancedMesh(shrubGeometry, surface("#4F7A3A", { roughness: 0.62 }), shrubCount);
  const shrubU: number[] = [];
  for (let index = 0; index < shrubCount; index++) {
    const u = (index + random() * 0.8) / shrubCount;
    shrubU.push(u);
    const { point, side } = frameAt(u);
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
  shrubs.name = "shrubs";
  group.add(chunkInstances(shrubs, shrubU, plantingChunkCount(lowPower)));

  group.add(blossomTrees(random, lowPower));
  return group;
}

// Cherry-blossom trees: a tapered trunk with two forked branches carrying blossom clusters.
function blossomTrees(random: () => number, lowPower: boolean) {
  const group = new Group();
  const treeCount = lowPower ? 8 : 18;
  const trunkGeometry = track(new CylinderGeometry(0.07, 0.16, 1.6, 8));
  trunkGeometry.translate(0, 0.8, 0);
  const branchGeometry = track(new CylinderGeometry(0.035, 0.07, 1.1, 6));
  branchGeometry.translate(0, 0.55, 0);
  const canopyGeometry = track(blossomCanopyGeometry());
  const forks = [-0.65, 0.65].map((lean) => {
    const branch = branchGeometry.clone();
    branch.rotateZ(lean);
    branch.rotateY(lean * 0.8);
    branch.translate(0, 1.45, 0);
    return branch;
  });
  const timber = track(mergeGeometries([trunkGeometry, ...forks], false));
  forks.forEach((branch) => branch.dispose());
  const trunks = new InstancedMesh(timber, surface("#5C4033", { roughness: 0.95 }), treeCount);
  const canopies = new InstancedMesh(canopyGeometry, surface("#FFFFFF", { vertexColors: true, roughness: 0.8 }), treeCount * 3);
  const dummy = new Object3D();
  const tint = [new Color("#FFFFFF"), new Color("#FFE9EE"), new Color("#F6D4DC")];

  const treeU: number[] = [];
  for (let tree = 0; tree < treeCount; tree++) {
    const u = tree / treeCount + random() * 0.02;
    treeU.push(u);
    const { point, side } = frameAt(u);
    const base = point.clone().addScaledVector(side, (4 + random() * 4) * (tree % 2 === 0 ? 1 : -1));
    const height = 0.9 + random() * 0.4;
    dummy.position.copy(base);
    dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.1);
    dummy.scale.set(1, height, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(tree, dummy.matrix);

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

  trunks.name = "trunks";
  canopies.name = "canopies";
  group.add(chunkInstances(trunks, treeU, plantingChunkCount(lowPower)));
  group.add(chunkInstances(canopies, treeU.flatMap((u) => [u, u, u]), plantingChunkCount(lowPower)));
  return group;
}

