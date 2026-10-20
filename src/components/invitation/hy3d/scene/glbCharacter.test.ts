import { afterEach, describe, expect, it, vi } from "vitest";
import { Bone, Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Scene, Vector3 } from "three";
import { loadCharacterPair, normalizeCharacter, type GlbCharacter } from "./glbCharacter";
import { emptyState } from "./characterRig";
import { swapCharacters } from "./swapCharacters";

function fakeCharacter(): GlbCharacter {
  const root = new Group();
  return { root, rightHand: root, state: emptyState(), update: vi.fn(), dispose: vi.fn() };
}

afterEach(() => vi.unstubAllGlobals());

describe("optional GLB character selection", () => {
  it("keeps the chibi pair on HEAD 404 without downloading either model", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);
    const load = vi.fn();
    expect(await loadCharacterPair(load)).toBeNull();
    expect(load).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/models/bride.glb", { method: "HEAD", signal: undefined });
    expect(fetchMock).toHaveBeenCalledWith("/models/groom.glb", { method: "HEAD", signal: undefined });
  });

  it("silently falls back when the probe fails", async () => {
    const load = vi.fn();
    expect(await loadCharacterPair(load, vi.fn().mockRejectedValue(new Error("offline")))).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("returns both models only after both are ready", async () => {
    const bride = fakeCharacter();
    const groom = fakeCharacter();
    const load = vi.fn().mockResolvedValueOnce(bride).mockResolvedValueOnce(groom);
    const pair = await loadCharacterPair(load, vi.fn().mockResolvedValue(new Response(null, { status: 200, headers: { "content-type": "model/gltf-binary" } })));
    expect(pair).toEqual({ bride, groom });
    expect(load.mock.calls).toEqual([["/models/bride.glb", "bride"], ["/models/groom.glb", "groom"]]);
  });

  it("disposes a successful half when its partner GLB fails", async () => {
    const bride = fakeCharacter();
    const load = vi.fn().mockResolvedValueOnce(bride).mockRejectedValueOnce(new Error("invalid GLB"));
    expect(await loadCharacterPair(load, vi.fn().mockResolvedValue(new Response(null, { status: 200, headers: { "content-type": "model/gltf-binary" } })))).toBeNull();
    expect(bride.dispose).toHaveBeenCalledOnce();
  });

  it("disposes downloads that finish after the scene was unmounted", async () => {
    const controller = new AbortController();
    const characters = [fakeCharacter(), fakeCharacter()];
    const load = vi.fn().mockImplementation(async () => {
      controller.abort();
      return characters[load.mock.calls.length - 1];
    });
    expect(await loadCharacterPair(load, vi.fn().mockResolvedValue(new Response(null, { status: 200, headers: { "content-type": "model/gltf-binary" } })), controller.signal)).toBeNull();
    characters.forEach((character) => expect(character.dispose).toHaveBeenCalledOnce());
  });

  it("preserves positions, gesture weights and the carried gift when swapping", () => {
    const scene = new Scene();
    const previous = { bride: fakeCharacter(), groom: fakeCharacter() };
    previous.groom.root.position.set(2, 0, -8);
    previous.groom.state.hold = 0.7;
    scene.add(previous.bride.root, previous.groom.root);
    const gift = new Group();
    gift.name = "gift";
    previous.groom.rightHand.add(gift);
    const pair = { bride: fakeCharacter(), groom: fakeCharacter() };
    pair.bride.root.userData.height = 1.6;
    pair.groom.root.userData.height = 1.7;
    const hand = new Bone();
    hand.scale.setScalar(0.01);
    pair.groom.root.add(hand);
    pair.groom.rightHand = hand;
    expect(swapCharacters(scene, previous, pair)).toBeCloseTo(1.7 / 1.1);
    expect(pair.groom.root.position.toArray()).toEqual([2, 0, -8]);
    expect(pair.groom.state.hold).toBe(0.7);
    expect(gift.parent).toBe(hand);
    pair.groom.root.updateMatrixWorld(true);
    expect(gift.getWorldScale(new Vector3()).x).toBeCloseTo(0.55);
    expect(previous.groom.root.parent).toBeNull();
  });
});

describe("GLB normalization", () => {
  it.each(["bride", "groom"] as const)("scales %s to the target height with feet on the ground", (role) => {
    const model = new Group();
    const mesh = new Mesh(new BoxGeometry(2, 4, 1), new MeshStandardMaterial());
    mesh.position.set(2, 4, 0);
    model.add(mesh);
    const bone = new Bone();
    bone.name = "mixamorig:RightHand";
    model.add(bone);
    const character = normalizeCharacter(model, role);
    const bounds = new Box3().setFromObject(character.root);
    expect(bounds.getSize(new Vector3()).y).toBeCloseTo(role === "bride" ? 1.6 : 1.7);
    expect(bounds.min.y).toBeCloseTo(0);
    expect(character.rightHand).toBe(bone);
    expect(mesh.castShadow).toBe(true);
  });

  it("uses the root if a right-hand bone is absent", () => {
    const model = new Group();
    model.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial()));
    const character = normalizeCharacter(model, "groom");
    expect(character.rightHand).toBe(character.root);
  });
});

