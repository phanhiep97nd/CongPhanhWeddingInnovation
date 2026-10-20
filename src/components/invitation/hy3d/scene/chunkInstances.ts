import { Color, Group, InstancedMesh, Matrix4, Vector3 } from "three";
import { chunkIndex, visibleChunks } from "./chunks";
import { PATH } from "./path";

export function plantingChunkCount(lowPower: boolean) {
  return lowPower ? 2 : 3;
}

// Move existing instances into tight, independently culled path sections.
export function chunkInstances(source: InstancedMesh, parameters: number[], count: number, windPadding = 0.12) {
  const group = new Group();
  const buckets = Array.from({ length: count }, () => [] as number[]);
  parameters.forEach((u, index) => buckets[chunkIndex(u, count)].push(index));
  const matrix = new Matrix4();
  const color = new Color();
  buckets.forEach((indices, chunk) => {
    if (!indices.length) return;
    const mesh = new InstancedMesh(source.geometry, source.material, indices.length);
    mesh.name = `${source.name}:${chunk}`;
    mesh.castShadow = source.castShadow;
    mesh.receiveShadow = source.receiveShadow;
    indices.forEach((index, destination) => {
      source.getMatrixAt(index, matrix);
      mesh.setMatrixAt(destination, matrix);
      if (source.instanceColor) {
        source.getColorAt(index, color);
        mesh.setColorAt(destination, color);
      }
    });
    mesh.computeBoundingSphere();
    mesh.boundingSphere!.radius += windPadding;
    mesh.userData.chunk = chunk;
    mesh.userData.chunkCount = count;
    mesh.userData.centre = PATH.getPointAt((chunk + 0.5) / count);
    group.add(mesh);
  });
  source.dispose();
  return group;
}

// Project the actual camera onto the path (the camera can be ahead of the couple).
const samples = Array.from({ length: 65 }, (_, index) => PATH.getPointAt(index / 64));

export function cullPlanting(planting: Group, camera: Vector3) {
  let nearest = 0;
  samples.forEach((point, index) => {
    if (point.distanceToSquared(camera) < samples[nearest].distanceToSquared(camera)) nearest = index;
  });
  // A broad arc-length filter followed by the requested world-space 22 m cutoff.
  const selections = new Map<number, number[]>();
  planting.traverse((object) => {
    if (object.userData.chunk === undefined) return;
    const count = object.userData.chunkCount;
    if (!selections.has(count)) selections.set(count, visibleChunks(nearest / 64, count, 25 / PATH.getLength()));
    const visible = selections.get(count)!;
    object.visible = visible.includes(object.userData.chunk)
      && object.userData.centre.distanceToSquared(camera) <= 22 * 22;
  });
}
