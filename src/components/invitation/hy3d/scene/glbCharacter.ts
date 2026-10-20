import { disposeModel } from "./disposeTree";
import { AnimationMixer, Box3, Group, MathUtils, Mesh, Object3D, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { looksLikeModel } from "./modelProbe";
import { characterAnimator } from "./characterClips";
import type { Character, CharacterState } from "./characters";

export { pickClip } from "./characterClips";
export type CharacterRole = "bride" | "groom";

export interface GlbCharacter extends Character {
  dispose(): void;
}

export function normalizeCharacter(model: Group, role: CharacterRole) {
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model);
  const height = bounds.getSize(new Vector3()).y;
  if (!Number.isFinite(height) || height <= 0) throw new Error("Empty character model");
  const root = new Group();
  root.name = role;
  root.userData.height = role === "bride" ? 1.6 : 1.7;
  // Keep normalization outside animated tracks: Mixamo can animate the scene root itself.
  const normalizer = new Group();
  normalizer.scale.setScalar(root.userData.height / height);
  normalizer.position.set(
    -(bounds.min.x + bounds.max.x) * 0.5 * normalizer.scale.x,
    -bounds.min.y * normalizer.scale.y,
    -(bounds.min.z + bounds.max.z) * 0.5 * normalizer.scale.z,
  );
  normalizer.add(model);
  root.add(normalizer);
  let rightHand: Object3D = root;
  model.traverse((object) => {
    if ((object as Object3D & { isBone?: boolean }).isBone
      && /hand.?r|righthand|mixamorig:?righthand/i.test(object.name)) rightHand = object;
    if (object instanceof Mesh) object.castShadow = true;
  });
  return { root, rightHand };
}

export async function loadGlbCharacter(url: string, role: CharacterRole): Promise<GlbCharacter> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  try {
    const { root, rightHand } = normalizeCharacter(gltf.scene, role);
    const mixer = new AnimationMixer(gltf.scene);
    const animate = characterAnimator(gltf.animations, mixer);
    const state: CharacterState = {
      walk: 0, walkPhase: 0, lookYaw: 0, bodyYaw: 0,
      wave: 0, point: 0, hug: 0, hold: 0, celebrate: 0, sit: 0,
    };
    return {
      root, rightHand, state,
      update(dt) {
        root.rotation.y = MathUtils.damp(root.rotation.y, state.bodyYaw, 6, dt);
        animate(state, dt);
      },
      dispose() {
        mixer.stopAllAction();
        mixer.uncacheRoot(gltf.scene);
        disposeModel(gltf.scene);
      },
    };
  } catch (error) {
    disposeModel(gltf.scene);
    throw error;
  }
}

// Both HEAD probes must succeed before downloading. Any failure keeps the procedural pair intact.
export async function loadCharacterPair(
  load = loadGlbCharacter,
  probe: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<{ bride: GlbCharacter; groom: GlbCharacter } | null> {
  const roles: CharacterRole[] = ["bride", "groom"];
  try {
    const heads = await Promise.all(roles.map((role) => probe(`/models/${role}.glb`, { method: "HEAD", signal })));
    if (heads.some((response) => !looksLikeModel(response)) || signal?.aborted) return null;
    const models = await Promise.allSettled(roles.map((role) => load(`/models/${role}.glb`, role)));
    const [bride, groom] = models;
    if (!signal?.aborted && bride.status === "fulfilled" && groom.status === "fulfilled") {
      return { bride: bride.value, groom: groom.value };
    }
    models.forEach((result) => {
      if (result.status === "fulfilled") result.value.dispose();
    });
  } catch {
    // Missing files, offline devices and invalid GLBs are all optional-model fallbacks.
  }
  return null;
}
