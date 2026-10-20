import { BufferGeometry, Float32BufferAttribute, Group, InstancedMesh, Material, Matrix4, Mesh, MeshStandardMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { track } from "./resources";

// Call on a rigid prop, never on a joint or a floating prop's parent.
export function mergeStatic(root: Group) {
  root.updateWorldMatrix(true, true);
  const inverse = new Matrix4().copy(root.matrixWorld).invert();
  const batches = new Map<string, { material: Material; parts: BufferGeometry[]; shadows: boolean }>();
  const sources: Mesh[] = [];
  root.traverse((object) => {
    if (!(object instanceof Mesh) || object instanceof InstancedMesh || Array.isArray(object.material)) return;
    const original = object.material;
    const pbr = original instanceof MeshStandardMaterial && !original.map
      && !original.transparent ? original : undefined;
    // Equal PBR responses can share a material even when the wood/paint colours differ.
    const response = pbr ? JSON.stringify([
      pbr.roughness, pbr.metalness, pbr.side, pbr.emissive.getHex(), pbr.emissiveIntensity,
      pbr.depthWrite, pbr.envMapIntensity,
    ]) : original.uuid;
    const key = `${response}:${object.castShadow}`;
    let batch = batches.get(key);
    if (!batch) {
      const material = pbr ? pbr.clone() : original;
      if (material instanceof MeshStandardMaterial && pbr) {
        material.color.set("#FFFFFF");
        material.vertexColors = true;
      }
      batch = { material, parts: [], shadows: object.castShadow };
      batches.set(key, batch);
    }
    const part = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    part.applyMatrix4(new Matrix4().multiplyMatrices(inverse, object.matrixWorld));
    if (pbr) {
      const colors = part.getAttribute("color");
      const values = new Float32Array(part.getAttribute("position").count * 3);
      for (let index = 0; index < values.length / 3; index++) {
        values.set([
          pbr.color.r * (colors?.getX(index) ?? 1),
          pbr.color.g * (colors?.getY(index) ?? 1),
          pbr.color.b * (colors?.getZ(index) ?? 1),
        ], index * 3);
      }
      part.setAttribute("color", new Float32BufferAttribute(values, 3));
    } else part.deleteAttribute("color");
    batch.parts.push(part);
    sources.push(object);
  });
  sources.forEach((mesh) => mesh.removeFromParent());
  batches.forEach(({ material, parts, shadows }) => {
    const geometry = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    const mesh = new Mesh(track(geometry), material);
    mesh.castShadow = shadows;
    geometry.computeBoundingSphere();
    root.add(mesh);
  });
  return root;
}
