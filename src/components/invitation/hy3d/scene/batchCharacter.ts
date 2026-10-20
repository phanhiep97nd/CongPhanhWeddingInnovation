import {
  Bone, BufferGeometry, Color, Float32BufferAttribute, Group, Mesh,
  MeshStandardMaterial, Skeleton, SkinnedMesh, Uint16BufferAttribute,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { surface } from "./materials";
import { track } from "./resources";

// Rigid skinning keeps every existing procedural joint and blink, with one draw per surface type.
// Each source mesh owns a bone; the renderer updates the bones from the original pose hierarchy.
export function batchCharacter(root: Group) {
  root.updateMatrixWorld(true);
  const batches = new Map<string, { material: MeshStandardMaterial; parts: BufferGeometry[]; bones: Bone[] }>();
  const sources: Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh && !Array.isArray(object.material)) sources.push(object);
  });
  for (const mesh of sources) {
    const original = mesh.material as MeshStandardMaterial;
    const opacity = original.opacity;
    const key = `${original.transparent}:${opacity}:${original.side}:${original.depthWrite}`;
    let batch = batches.get(key);
    if (!batch) {
      batch = {
        material: surface("#FFFFFF", {
          vertexColors: true, roughness: 0.7, transparent: original.transparent,
          opacity, doubleSide: original.side === 2,
        }).clone(),
        parts: [], bones: [],
      };
      batch.material.depthWrite = original.depthWrite;
      batches.set(key, batch);
    }
    const part = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    part.applyMatrix4(mesh.matrixWorld);
    part.deleteAttribute("uv");
    const count = part.getAttribute("position").count;
    const color = original.color ?? new Color("#FFFFFF");
    const colors = new Float32Array(count * 3);
    const indices = new Uint16Array(count * 4);
    const weights = new Float32Array(count * 4);
    for (let index = 0; index < count; index++) {
      colors.set([color.r, color.g, color.b], index * 3);
      indices[index * 4] = batch.bones.length;
      weights[index * 4] = 1;
    }
    part.setAttribute("color", new Float32BufferAttribute(colors, 3));
    part.setAttribute("skinIndex", new Uint16BufferAttribute(indices, 4));
    part.setAttribute("skinWeight", new Float32BufferAttribute(weights, 4));
    const bone = new Bone();
    mesh.add(bone);
    batch.bones.push(bone);
    batch.parts.push(part);
    mesh.visible = false;
  }
  root.updateMatrixWorld(true);
  batches.forEach(({ material, parts, bones }) => {
    const geometry = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    const mesh = new SkinnedMesh(track(geometry), material);
    mesh.name = "procedural-batch";
    mesh.castShadow = !material.transparent;
    mesh.frustumCulled = false;
    root.add(mesh);
    mesh.bind(new Skeleton(bones));
  });
}

export function disposeCharacterBatches(root: Group) {
  root.traverse((object) => {
    if (!(object instanceof SkinnedMesh)) return;
    object.skeleton.dispose();
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
}
