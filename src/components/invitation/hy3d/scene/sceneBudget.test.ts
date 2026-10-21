import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DirectionalLight, DoubleSide, Frustum, Matrix4, Mesh, PerspectiveCamera,
  Scene, SkinnedMesh, Texture, Vector2, Vector3, type InstancedMesh,
} from "three";
import { buildBride, buildGroom, disposeCharacterGeometries } from "./characters";
import { buildWorld, disposeWorld, Petals, redEnvelope } from "./world";
import { cameraPose } from "./cameraPose";
import { cullPlanting } from "./chunkInstances";
import { cullLandmarks } from "./landmarks";
import { direct } from "./choreography";
import { frameAt } from "./path";
import { disposeMaterials } from "./materials";
import { CelebrationParticles } from "./celebrationParticles";
import { EnvelopeIntro } from "./envelopeIntro";

vi.mock("./textures", () => ({
  FONTS: { serif: "serif", sans: "sans-serif", script: "cursive" },
  textCard: () => new Texture(),
  loadPhoto: () => undefined,
}));

function countPass(scene: Scene, frustum: Frustum, shadow = false) {
  let triangles = 0;
  let calls = 0;
  scene.traverseVisible((object) => {
    if (!(object instanceof Mesh) || (shadow && !object.castShadow)) return;
    if (object.frustumCulled && !frustum.intersectsObject(object)) return;
    const instances = (object as InstancedMesh).isInstancedMesh ? (object as InstancedMesh).count : 1;
    if (!instances) return;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    const passes = !shadow && material.transparent && material.side === DoubleSide && !material.forceSinglePass ? 2 : 1;
    triangles += (object.geometry.index?.count ?? object.geometry.getAttribute("position").count) / 3 * instances * passes;
    calls += passes;
  });
  return { triangles, calls };
}

afterEach(() => {
  disposeWorld();
  disposeCharacterGeometries();
  disposeMaterials();
  vi.restoreAllMocks();
});

describe("mobile rendering budget", () => {
  it.each([false, true])("fits the budget throughout the path (lowPower=%s)", (lowPower) => {
    // No photo requests or real canvas needed; canvas artwork does not affect geometry counts.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(new Proxy({}, {
      get: () => () => undefined,
      set: () => true,
    }) as CanvasRenderingContext2D);
    const data = {
      groom: "Công", bride: "Anh", guestName: "Bạn", dateText: "12.12.2026", venueName: "Aman Villa",
      colors: ["#F2C8CD", "#D4E0C4", "#2F3A55"],
      stations: ["story", "timeline", "gallery", "info", "rsvp", "rooms", "photoWall", "dressCode", "giftBox", "custom:test"],
      timeline: Array.from({ length: 5 }, () => ({ time: "18:00", title: "Đón khách" })),
      photos: Array.from({ length: 6 }, () => "/unused.jpg"),
    };
    const scene = new Scene();
    const world = buildWorld(scene, data, lowPower);
    const groom = buildGroom();
    const bride = buildBride();
    scene.add(groom.root, bride.root);
    const gift = redEnvelope();
    gift.scale.setScalar(0.55);
    gift.position.set(0, -0.08, 0.09);
    groom.rightHand.add(gift);
    const petals = new Petals(lowPower ? 60 : 140);
    scene.add(petals.mesh);
    const particles = new CelebrationParticles(scene, lowPower);
    particles.spawnHearts(new Vector3(0, 1.3, 0), 6);
    particles.spawnConfetti(new Vector3(0, 1.6, 0));
    const envelope = new EnvelopeIntro(scene, data, false, () => {}, () => {});
    envelope.build();
    const light = new DirectionalLight();
    Object.assign(light.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 });
    light.shadow.camera.updateProjectionMatrix();
    scene.add(light, light.target);
    const maximum = { triangles: 0, calls: 0 };
    let peak = {};
    for (const aspect of [390 / 844, 844 / 390, 1]) {
      const camera = new PerspectiveCamera(aspect < 0.8 ? 50 : 40, aspect, 0.1, 120);
      for (const tilt of [-1, 0, 1]) {
        for (let index = -1; index <= 100; index++) {
          const u = index < 0 ? 0.02 : 0.02 + index / 100 * 0.95;
          const { point, side } = frameAt(u);
          groom.root.position.copy(point).addScaledVector(side, -0.3);
          bride.root.position.copy(point).addScaledVector(side, 0.3);
          const direction = direct({ stations: world.stations, coupleU: u, cameraGoal: camera.position, camera, tapReaction: 0, homeFocus: world.home.focus }, 0);
          const look = new Vector3();
          gift.visible = direction.hold > 0.4;
          const intro = index < 0;
          envelope.group!.visible = intro;
          cameraPose({
            coupleU: u, centre: point, orbit: direction.orbit, distance: direction.distance,
            characterScale: 1, aspect, fov: camera.fov, lookBias: direction.lookBias,
            tilt: new Vector2(tilt, tilt), focus: direction.focus ?? direction.station?.focus, envelope: intro ? envelope.group : undefined,
          }, camera.position, look);
          camera.lookAt(look);
          if (aspect < 0.8) camera.setViewOffset(390, 844, 0, 844 * (intro ? -0.15 : index < 5 ? -0.08 : 0.17), 390, 844);
          camera.updateMatrixWorld();
          cullPlanting(world.planting, camera.position);
          cullLandmarks(world.landmarks, camera.position);
          world.stations.forEach((station) => {
            station.object.visible = station.focus.distanceToSquared(camera.position) <= 22 * 22;
          });
          petals.update(0, 0, point);
          particles.update(0, camera);
          light.position.set(point.x - 4, 9, point.z - 5);
          light.target.position.copy(point);
          scene.updateMatrixWorld(true);
          const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
          const main = countPass(scene, frustum);
          light.shadow.updateMatrices(light);
          const shadow = lowPower ? { triangles: 0, calls: 0 } : countPass(scene, light.shadow.getFrustum(), true);
          maximum.triangles = Math.max(maximum.triangles, main.triangles + shadow.triangles + (lowPower ? 48 : 0));
          const calls = main.calls + shadow.calls + (lowPower ? 2 : 0);
          if (calls > maximum.calls) peak = { u, aspect, main, shadow };
          maximum.calls = Math.max(maximum.calls, calls);
        }
      }
    }
    console.info("Hỷ 3D conservative CPU estimate", { lowPower, ...maximum, peak });
    expect(maximum.triangles).toBeLessThanOrEqual(lowPower ? 110000 : 220000);
    expect(maximum.calls).toBeLessThanOrEqual(lowPower ? 60 : 80);
    particles.dispose();
  });

  it("keeps rigid character batches attached to their animated source joints", () => {
    const character = buildGroom();
    let source: Mesh | undefined;
    let batch: SkinnedMesh | undefined;
    character.root.traverse((object) => {
      if (object instanceof SkinnedMesh && !batch) batch = object;
      else if (object instanceof Mesh && !source) source = object;
    });
    const vertex = new Vector3().fromBufferAttribute(source!.geometry.getAttribute("position"), source!.geometry.index?.getX(0) ?? 0);
    character.state.walk = 1;
    character.state.walkPhase = 1;
    character.state.bodyYaw = 0.6;
    character.update(0.1, 1);
    character.root.position.set(2, 0, -8);
    character.root.updateMatrixWorld(true);
    batch!.skeleton.update();
    const actual = batch!.getVertexPosition(0, new Vector3()).applyMatrix4(batch!.matrixWorld);
    const expected = vertex.applyMatrix4(source!.matrixWorld);
    expect(actual.distanceTo(expected)).toBeLessThan(0.00001);
  });
});
