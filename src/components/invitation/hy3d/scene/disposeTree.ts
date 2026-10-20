import { Mesh, Object3D, Texture } from "three";

export function disposeModel(root: Object3D) {
  const textures = new Set<Texture>();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    if ("isInstancedMesh" in object) (object as import("three").InstancedMesh).dispose();
    if ("skeleton" in object) (object as import("three").SkinnedMesh).skeleton.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof Texture) textures.add(value);
      });
      material.dispose();
    });
  });
  textures.forEach((texture) => {
    const image = texture.image;
    if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) image.close();
    texture.dispose();
  });
}

