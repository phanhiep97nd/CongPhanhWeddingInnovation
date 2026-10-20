import { disposeModel } from "./disposeTree";
import { swapCharacters } from "./swapCharacters";
import { cameraPose } from "./cameraPose";
import { setupRenderer } from "./renderSetup";
import { EnvelopeIntro } from "./envelopeIntro";
import { CelebrationParticles } from "./celebrationParticles";
import { direct, type Direction } from "./choreography";
import { cullPlanting } from "./chunkInstances";
import type { GlbCharacter } from "./glbCharacter";
import { modelsAvailable } from "./modelProbe";
import {
  CircleGeometry, DirectionalLight, Group, MathUtils, Mesh, MeshBasicMaterial,
  PerspectiveCamera, Raycaster, Scene, Texture, Timer, Vector2, Vector3, WebGLRenderer,
} from "three";
import { buildBride, buildGroom, disposeCharacterGeometries, type Character } from "./characters";
import { PALETTE, disposeMaterials, isDark, windUniform } from "./materials";
import { ensureFonts } from "./textures";
import { Petals, buildWorld, clamp01, disposeWorld, floatProps, frameAt, redEnvelope, type Station } from "./world";

import { sceneOptionsFor, type SceneData, type SceneOptions } from "./sceneData";
export type { SceneData, SceneOptions } from "./sceneData";

// Scroll progress p ∈ [0, 1] (from the HTML overlay) maps to the walk parameter u along the path.
// Station i sits at p = (i + 1) / (n + 1), which is where the overlay centres section i.
const START_U = 0.02;
const END_U = 0.97;
const PATH_LENGTH = 42;

export function progressToU(progress: number) {
  return START_U + clamp01(progress) * (END_U - START_U);
}

export function stationProgress(index: number, count: number) {
  return (index + 1) / (count + 1);
}

// ── Scene ─────────────────────────────────────────────────────────────────────
export class WeddingScene {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(42, 1, 0.1, 120);
  groom: Character;
  bride: Character;
  readonly stations: Station[];
  private readonly planting: Group;
  private readonly modelAbort = new AbortController();
  private models?: { bride: GlbCharacter; groom: GlbCharacter };
  private characterScale = 1;
  private readonly timer = new Timer();
  private readonly sun = new DirectionalLight("#FFE4CC", 2.6);
  private environment?: Texture;
  private readonly petals: Petals;
  private readonly particles: CelebrationParticles;
  private readonly raycaster = new Raycaster();
  private readonly cameraGoal = new Vector3();
  private readonly lookGoal = new Vector3();
  private readonly look = new Vector3();
  private readonly tilt = new Vector2();
  private targetU = START_U;
  private coupleU = START_U;
  private walkDistance = 0;
  private orbit = -0.55;
  private distance = 3.4;
  private lookBias = 0;
  private running = false;
  private disposed = false;
  private readonly envelope: EnvelopeIntro;
  private get intro() {
    return this.envelope.phase;
  }
  private celebrated = false;
  private tapReaction = 0;
  private visible = true;
  private progress = 0;
  private viewShift = 0;      // fraction of the screen height the image is shifted (portrait phones)
  private readonly settings: ReturnType<typeof sceneOptionsFor>;
  private lastFrameTime: number | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly data: SceneData, private readonly options: SceneOptions = {}) {
    this.settings = sceneOptionsFor(options);
    this.envelope = new EnvelopeIntro(this.scene, data, this.settings.skipIntro, () => this.snapCamera(), () => this.applyViewOffset());
    const rendering = setupRenderer(canvas, this.scene, this.sun, options);
    this.renderer = rendering.renderer;
    this.environment = rendering.environment;

    const suit = data.colors.find(isDark) || PALETTE.suit;
    const light = data.colors.filter((color) => !isDark(color));
    this.groom = buildGroom({ suit, accent: PALETTE.son });
    this.bride = buildBride({
      sash: light[0] || PALETTE.blush,
      bouquet: light.length ? [...light.slice(0, 3), "#FFFFFF", PALETTE.blush] : undefined,
    });
    this.scene.add(this.groom.root, this.bride.root);
    // Low-power phones skip shadow maps, so the couple gets soft contact blobs instead.
    if (options.lowPower) {
      this.addShadow(this.groom.root, 0.32);
      this.addShadow(this.bride.root, 0.42);
    }

    const world = buildWorld(this.scene, data, options.lowPower);
    this.stations = world.stations;
    this.planting = world.planting;
    this.particles = new CelebrationParticles(this.scene, options.lowPower ?? false);
    this.petals = new Petals(options.lowPower ? 60 : 140);
    this.scene.add(this.petals.mesh);

    // The groom carries a red envelope only at the gift-box station.
    const gift = redEnvelope();
    gift.scale.setScalar(0.55);
    gift.position.set(0, -0.08, 0.09);
    gift.visible = false;
    gift.name = "gift";
    this.groom.rightHand.add(gift);

    this.resize();
    this.placeCouple(START_U, 0);
    this.snapCamera();
  }

  // ── Public API ────────────────────────────────────────────────────────────
  async init() {
    await ensureFonts();
    if (this.disposed) return;
    if (this.intro !== "done") this.envelope.build();
    void this.tryCharacters();
  }

  private async tryCharacters() {
    // Probe first: the GLTF loader + Meshopt decoder are fetched only when both models exist.
    if (!(await modelsAvailable(this.modelAbort.signal)) || this.disposed) return;
    const { loadCharacterPair } = await import("./glbCharacter");
    const pair = await loadCharacterPair(undefined, undefined, this.modelAbort.signal);
    if (!pair) return;
    if (this.disposed) {
      pair.bride.dispose();
      pair.groom.dispose();
      return;
    }
    this.characterScale = swapCharacters(this.scene, { bride: this.bride, groom: this.groom }, pair);
    this.bride = pair.bride;
    this.groom = pair.groom;
    this.models = pair;
    if (this.options.lowPower) {
      this.addShadow(this.bride.root, 0.42);
      this.addShadow(this.groom.root, 0.32);
    }
  }

  setProgress(progress: number) {
    this.progress = progress;
    this.targetU = progressToU(progress);
    if (progress > 0.01) this.envelope.leave();
  }

  // Taps on the canvas: open the envelope, or make the couple react.
  tap(clientX: number, clientY: number) {
    if (!this.settings.taps) return;
    if (this.intro === "envelope" || this.intro === "opening") {
      this.envelope.phase = "opening";
      return;
    }
    if (this.intro === "card") {
      this.envelope.leave();
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const pointer = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(pointer, this.camera);
    const hits = this.raycaster.intersectObjects([this.groom.root, this.bride.root], true);
    if (hits.length) {
      this.tapReaction = 1.8;
      this.particles.spawnHearts(this.coupleCentre().setY(1.25), 5);
    }
  }

  setTilt(x: number, y: number) {
    if (!this.settings.tilt) return;
    this.tilt.set(MathUtils.clamp(x, -1, 1), MathUtils.clamp(y, -1, 1));
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    if (visible) this.start();
    else this.stop();
  }

  isIntroActive() {
    return this.intro !== "done";
  }

  resize() {
    const { clientWidth, clientHeight } = this.canvas;
    if (!clientWidth || !clientHeight) return;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.fov = this.camera.aspect < 0.8 ? 50 : 40;
    this.applyViewOffset();
  }

  // Shift the couple above the content cards on portrait phones.
  private applyViewOffset() {
    const { clientWidth: width, clientHeight: height } = this.canvas;
    if (width && height && this.camera.aspect < 0.8 && Math.abs(this.viewShift) > 0.001) {
      this.camera.setViewOffset(width, height, 0, height * this.viewShift, width, height);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
  }

  private updateViewShift(dt: number) {
    const openingEnd = 0.5 / (this.stations.length + 1);
    if (!this.settings.viewShift) {
      // Background (mixed) mode: only on the classic hero move the couple below the big title text.
      this.dampViewShift(this.progress < openingEnd ? -0.16 : 0, dt);
      return;
    }
    // The envelope sits lower than the couple so the hero text above stays clear.
    const opening = this.intro === "done" ? -0.08 : -0.15;
    this.dampViewShift(this.progress < openingEnd ? opening : 0.17, dt);
  }

  private dampViewShift(target: number, dt: number) {
    const next = MathUtils.damp(this.viewShift, target, 3, dt);
    if (Math.abs(next - this.viewShift) > 0.0005) {
      this.viewShift = next;
      this.applyViewOffset();
    }
  }

  start() {
    if (this.running || this.disposed || !this.visible) return;
    this.running = true;
    this.lastFrameTime = null;
    this.timer.reset();
    this.renderer.setAnimationLoop((time) => this.frame(time));
  }

  stop() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  dispose() {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
    this.modelAbort.abort();
    this.models?.bride.dispose();
    this.models?.groom.dispose();
    this.models?.bride.root.removeFromParent();
    this.models?.groom.root.removeFromParent();
    this.envelope.dispose();
    disposeModel(this.scene);
    this.particles.dispose();
    disposeCharacterGeometries();
    disposeWorld();
    disposeMaterials();
    this.environment?.dispose();
    this.renderer.dispose();
  }

  // ── Frame ─────────────────────────────────────────────────────────────────
  private frame(time: number) {
    const fps = this.settings.fpsCap;
    if (fps && this.lastFrameTime !== null && time - this.lastFrameTime < 1000 / fps - 0.5) return;
    this.lastFrameTime = time;
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 1 / 20);
    this.update(dt, this.timer.getElapsed());
    this.renderer.render(this.scene, this.camera);
    this.stats.frames++;
    this.stats.triangles = this.renderer.info.render.triangles;
    this.stats.calls = this.renderer.info.render.calls;
  }

  // Lightweight counters read by the dev playground and the automated performance check.
  readonly stats = { frames: 0, triangles: 0, calls: 0 };

  private update(dt: number, time: number) {
    windUniform.value = time;
    if (this.intro !== "done") this.envelope.update(dt);

    const previous = this.coupleU;
    this.coupleU = MathUtils.damp(this.coupleU, this.targetU, 2.2, dt);
    const travelled = Math.abs(this.coupleU - previous) * PATH_LENGTH;
    this.walkDistance += travelled;
    const walking = MathUtils.clamp(travelled / Math.max(dt, 1e-4) / 0.9, 0, 1);
    this.placeCouple(this.coupleU, walking);

    const direction = direct({ stations: this.stations, coupleU: this.coupleU, cameraGoal: this.cameraGoal, camera: this.camera, tapReaction: this.tapReaction }, walking);
    this.perform(direction, dt);

    this.groom.update(dt, time);
    this.bride.update(dt, time);
    this.petals.update(dt, time, this.coupleCentre());
    floatProps(this.stations, time);
    this.particles.update(dt, this.camera);
    this.updateCamera(direction, dt);
    this.updateViewShift(dt);
    this.followSun();
    cullPlanting(this.planting, this.camera.position);
    this.stations.forEach((station) => {
      station.object.visible = station.focus.distanceToSquared(this.camera.position) <= 22 * 22;
    });
  }

  // ── Couple ────────────────────────────────────────────────────────────────
  private placeCouple(u: number, walking: number) {
    const { point, side } = frameAt(u);
    this.groom.root.position.copy(point).addScaledVector(side, -0.3);
    this.bride.root.position.copy(point).addScaledVector(side, 0.3);
    for (const character of [this.groom, this.bride]) {
      character.state.walk = MathUtils.damp(character.state.walk, walking, 6, 1 / 60);
      character.state.walkPhase = this.walkDistance * 9;
    }
  }

  private coupleCentre() {
    return this.groom.root.position.clone().lerp(this.bride.root.position, 0.5);
  }

  private perform(direction: Direction, dt: number) {
    if (this.tapReaction > 0) this.tapReaction -= dt;
    const groom = this.groom.state;
    const bride = this.bride.state;
    const rate = 4;
    groom.wave = MathUtils.damp(groom.wave, direction.wave, rate, dt);
    bride.wave = MathUtils.damp(bride.wave, direction.waveBride, rate, dt);
    groom.point = MathUtils.damp(groom.point, direction.point, rate, dt);
    groom.hold = MathUtils.damp(groom.hold, direction.hold, rate, dt);
    groom.hug = MathUtils.damp(groom.hug, direction.hug, rate, dt);
    bride.hug = MathUtils.damp(bride.hug, direction.hug, rate, dt);
    groom.celebrate = MathUtils.damp(groom.celebrate, direction.celebrate, rate, dt);
    bride.celebrate = MathUtils.damp(bride.celebrate, direction.celebrate, rate, dt);

    groom.bodyYaw = this.yawToward(this.groom, direction.faceGroom, this.bride);
    bride.bodyYaw = this.yawToward(this.bride, direction.faceBride, this.groom);
    groom.lookYaw = 0;
    bride.lookYaw = 0;

    const gift = this.groom.rightHand.getObjectByName("gift");
    if (gift) gift.visible = groom.hold > 0.4;

    if (direction.key === "end") {
      // Step toward each other for the hug, then celebrate once.
      const middle = this.coupleCentre();
      this.groom.root.position.lerp(middle, 0.42 * groom.hug);
      this.bride.root.position.lerp(middle, 0.42 * bride.hug);
      if (!this.celebrated && groom.hug > 0.6) {
        this.celebrated = true;
        this.particles.spawnConfetti(middle.clone().setY(1.6));
        this.particles.spawnHearts(middle.clone().setY(1.3), 6);
      }
    }
    if (direction.key === "story" && Math.random() < dt * 0.9) {
      this.particles.spawnHearts(this.coupleCentre().setY(1.3), 1);
    }
  }

  private yawToward(character: Character, target: Direction["faceGroom"], partner: Character) {
    const position = character.root.position;
    let point: Vector3;
    if (target === "path") {
      const { tangent } = frameAt(Math.min(this.coupleU + 0.01, 1));
      return Math.atan2(tangent.x, tangent.z);
    }
    if (target === "partner") point = partner.root.position;
    else point = target;
    return Math.atan2(point.x - position.x, point.z - position.z);
  }

  // Keep the shadow box centred on the couple as they walk.
  private followSun() {
    const centre = this.coupleCentre();
    this.sun.position.set(centre.x - 4, 9, centre.z - 5);
    this.sun.target.position.copy(centre);
  }

  private addShadow(root: Group, radius: number) {
    const shadow = new Mesh(new CircleGeometry(radius, 24), new MeshBasicMaterial({ color: "#7A5A50", transparent: true, opacity: 0.18, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    root.add(shadow);
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  // The camera orbits the couple: ahead of them (seeing their faces), swinging aside at stations.
  private computeCamera(direction: Direction | undefined, position: Vector3, look: Vector3) {
    cameraPose({
      coupleU: this.coupleU, centre: this.coupleCentre(), orbit: this.orbit,
      tilt: this.tilt, distance: this.distance, characterScale: this.characterScale,
      aspect: this.camera.aspect, fov: this.camera.fov, lookBias: this.lookBias,
      focus: direction?.station?.focus,
      envelope: this.intro !== "done" ? this.envelope.group : undefined,
    }, position, look);
  }

  private snapCamera() {
    this.computeCamera(undefined, this.cameraGoal, this.lookGoal);
    this.camera.position.copy(this.cameraGoal);
    this.look.copy(this.lookGoal);
    this.camera.lookAt(this.look);
  }

  private updateCamera(direction: Direction, dt: number) {
    this.orbit = MathUtils.damp(this.orbit, direction.orbit, 1.6, dt);
    this.distance = MathUtils.damp(this.distance, direction.distance, 1.6, dt);
    this.lookBias = MathUtils.damp(this.lookBias, direction.lookBias, 1.6, dt);
    this.computeCamera(direction, this.cameraGoal, this.lookGoal);
    const rate = this.intro === "leaving" ? 2.4 : 3.5;
    this.camera.position.x = MathUtils.damp(this.camera.position.x, this.cameraGoal.x, rate, dt);
    this.camera.position.y = MathUtils.damp(this.camera.position.y, this.cameraGoal.y, rate, dt);
    this.camera.position.z = MathUtils.damp(this.camera.position.z, this.cameraGoal.z, rate, dt);
    this.look.x = MathUtils.damp(this.look.x, this.lookGoal.x, rate, dt);
    this.look.y = MathUtils.damp(this.look.y, this.lookGoal.y, rate, dt);
    this.look.z = MathUtils.damp(this.look.z, this.lookGoal.z, rate, dt);
    this.camera.lookAt(this.look);
  }

}
