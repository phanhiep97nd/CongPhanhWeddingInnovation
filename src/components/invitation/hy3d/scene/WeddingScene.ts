import {
  BoxGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  Timer,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { buildBride, buildGroom, disposeCharacterGeometries, type Character } from "./characters";
import { PALETTE, disposeMaterials, flat, toon } from "./materials";
import { FONTS, ensureFonts, textCard } from "./textures";
import { Petals, buildWorld, clamp01, disposeWorld, floatProps, frameAt, heart, hySign, redEnvelope, type Station } from "./world";

export interface SceneData {
  groom: string;
  bride: string;
  guestName: string;
  dateText: string;
  venueName: string;
  colors: string[];
  stations: string[];          // enabled section keys in display order
  timeline: { time: string; title: string }[];
  photos: string[];            // gallery image URLs (already sized for textures)
}

export interface SceneOptions {
  pixelRatioCap?: number;
  skipIntro?: boolean;
  lowPower?: boolean;
}

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

type IntroPhase = "envelope" | "opening" | "card" | "leaving" | "done";

interface Direction {
  key: string;
  station?: Station;
  faceGroom: Vector3 | "partner" | "path";
  faceBride: Vector3 | "partner" | "path";
  wave: number;
  waveBride: number;
  point: number;
  hold: number;
  hug: number;
  celebrate: number;
  orbit: number;          // camera angle around the couple: 0 = straight ahead, ±π/2 = beside
  distance: number;
  lookBias: number;       // 0 = look at the couple, 1 = look at the station prop
}

// ── Scene ─────────────────────────────────────────────────────────────────────
export class WeddingScene {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(42, 1, 0.1, 120);
  readonly groom: Character;
  readonly bride: Character;
  readonly stations: Station[];
  private readonly timer = new Timer();
  private readonly petals: Petals;
  private readonly hearts: { mesh: Mesh; life: number; velocity: Vector3 }[] = [];
  private readonly confetti: { mesh: Mesh; life: number; velocity: Vector3; spin: Vector3 }[] = [];
  private readonly raycaster = new Raycaster();
  private readonly cameraGoal = new Vector3();
  private readonly lookGoal = new Vector3();
  private readonly look = new Vector3();
  private readonly tilt = new Vector2();
  private readonly options: SceneOptions;
  private targetU = START_U;
  private coupleU = START_U;
  private walkDistance = 0;
  private orbit = -0.55;
  private distance = 3.4;
  private lookBias = 0;
  private running = false;
  private disposed = false;
  private intro: IntroPhase;
  private introTime = 0;
  private introGroup?: Group;
  private flap?: Group;
  private card?: Mesh;
  private celebrated = false;
  private tapReaction = 0;
  private visible = true;
  private progress = 0;
  private viewShift = 0;      // fraction of the screen height the image is shifted (portrait phones)
  private cardShownAt = 0;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly data: SceneData, options: SceneOptions = {}) {
    this.options = options;
    this.intro = options.skipIntro ? "done" : "envelope";
    this.renderer = new WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, alpha: false, powerPreference: "default" });
    this.renderer.outputColorSpace = SRGBColorSpace;
    const cap = options.pixelRatioCap ?? (options.lowPower ? 1.25 : 1.75);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));

    this.scene.background = new Color(PALETTE.paper);
    this.scene.fog = new Fog(PALETTE.paper, 9, 30);

    const sky = new HemisphereLight("#FFF6F1", PALETTE.grassDeep, 1.5);
    const sun = new DirectionalLight("#FFE9D6", 1.5);
    sun.position.set(-3, 8, -6);
    this.scene.add(sky, sun);

    const suit = data.colors.find(isDark) || PALETTE.suit;
    const light = data.colors.filter((color) => !isDark(color));
    this.groom = buildGroom({ suit, accent: PALETTE.son });
    this.bride = buildBride({
      sash: light[0] || PALETTE.blush,
      bouquet: light.length ? [...light.slice(0, 3), "#FFFFFF", PALETTE.blush] : undefined,
    });
    this.scene.add(this.groom.root, this.bride.root);
    this.addShadow(this.groom.root, 0.32);
    this.addShadow(this.bride.root, 0.42);

    const world = buildWorld(this.scene, data);
    this.stations = world.stations;
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
    if (this.intro !== "done") this.buildIntro();
  }

  setProgress(progress: number) {
    this.progress = progress;
    this.targetU = progressToU(progress);
    if (progress > 0.01) this.leaveIntro();
  }

  // Taps on the canvas: open the envelope, or make the couple react.
  tap(clientX: number, clientY: number) {
    if (this.intro === "envelope" || this.intro === "opening") {
      this.intro = "opening";
      return;
    }
    if (this.intro === "card") {
      this.leaveIntro();
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const pointer = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(pointer, this.camera);
    const hits = this.raycaster.intersectObjects([this.groom.root, this.bride.root], true);
    if (hits.length) {
      this.tapReaction = 1.8;
      this.spawnHearts(this.coupleCentre().setY(1.25), 5);
    }
  }

  setTilt(x: number, y: number) {
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

  // On portrait phones the content cards cover the lower half, so after the intro the rendered
  // image is shifted up: the couple sits in the top half of the screen.
  // Portrait phones: at the opening the HTML hero text sits at the top, so the image moves down a little;
  // at the stops the content card covers the lower half, so the couple moves up into the top half.
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
    // The envelope sits lower than the couple so the hero text above stays clear.
    const opening = this.intro === "done" ? -0.08 : -0.15;
    const target = this.progress < openingEnd ? opening : 0.17;
    const next = MathUtils.damp(this.viewShift, target, 3, dt);
    if (Math.abs(next - this.viewShift) > 0.0005) {
      this.viewShift = next;
      this.applyViewOffset();
    }
  }

  start() {
    if (this.running || this.disposed || !this.visible) return;
    this.running = true;
    this.timer.reset();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  stop() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  dispose() {
    this.stop();
    this.disposed = true;
    disposeCharacterGeometries();
    disposeWorld();
    disposeMaterials();
    this.renderer.dispose();
  }

  // ── Frame ─────────────────────────────────────────────────────────────────
  private frame() {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 1 / 20);
    this.update(dt, this.timer.getElapsed());
    this.renderer.render(this.scene, this.camera);
  }

  private update(dt: number, time: number) {
    if (this.intro !== "done") this.updateIntro(dt);

    const previous = this.coupleU;
    this.coupleU = MathUtils.damp(this.coupleU, this.targetU, 2.2, dt);
    const travelled = Math.abs(this.coupleU - previous) * PATH_LENGTH;
    this.walkDistance += travelled;
    const walking = MathUtils.clamp(travelled / Math.max(dt, 1e-4) / 0.9, 0, 1);
    this.placeCouple(this.coupleU, walking);

    const direction = this.direct(walking);
    this.perform(direction, dt);

    this.groom.update(dt, time);
    this.bride.update(dt, time);
    this.petals.update(dt, time, this.coupleCentre());
    floatProps(this.stations, time);
    this.updateParticles(dt);
    this.updateCamera(direction, dt);
    this.updateViewShift(dt);
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

  // Decides what the couple does and where the camera should be, from the nearest station.
  private direct(walking: number): Direction {
    let station: Station | undefined;
    let nearest = Infinity;
    for (const candidate of this.stations) {
      const distance = Math.abs(candidate.u - this.coupleU);
      if (distance < nearest) {
        nearest = distance;
        station = candidate;
      }
    }
    const settled = walking < 0.35;
    const atStation = station && nearest < 0.035 && settled ? station : undefined;
    const atEnd = this.coupleU > END_U - 0.02 && settled;
    const camera = this.cameraGoal;

    const direction: Direction = {
      key: atEnd ? "end" : atStation?.key ?? "walk",
      station: atStation,
      faceGroom: "path",
      faceBride: "path",
      wave: 0,
      waveBride: 0,
      point: 0,
      hold: 0,
      hug: 0,
      celebrate: 0,
      orbit: -0.55,
      distance: this.camera.aspect < 0.8 ? 4.1 : 3.4,
      lookBias: 0,
    };
    // Camera sits on the opposite side of the prop so both the couple and the prop are framed.
    const away = atStation ? -atStation.side : -1;

    switch (direction.key) {
      case "story":
        direction.faceGroom = "partner";
        direction.faceBride = "partner";
        direction.orbit = away * 0.4;
        direction.lookBias = 0.12;
        break;
      case "timeline":
        direction.faceGroom = atStation!.focus;
        direction.faceBride = atStation!.focus;
        direction.point = 1;
        direction.orbit = away * 0.6;
        direction.lookBias = 0.35;
        break;
      case "gallery":
        direction.faceGroom = atStation!.focus;
        direction.faceBride = atStation!.focus;
        direction.orbit = away * 0.65;
        direction.lookBias = 0.4;
        break;
      case "info":
        direction.faceGroom = camera;
        direction.faceBride = camera;
        direction.waveBride = 1;
        direction.orbit = 0.15;
        direction.distance += 1.2;
        direction.lookBias = 0.2;
        break;
      case "giftBox":
        direction.faceGroom = camera;
        direction.faceBride = camera;
        direction.hold = 1;
        direction.orbit = away * 0.5;
        direction.lookBias = 0.15;
        break;
      case "dressCode":
        direction.faceGroom = camera;
        direction.faceBride = camera;
        direction.celebrate = 0.6;
        direction.orbit = away * 0.55;
        direction.lookBias = 0.2;
        break;
      case "end":
        direction.faceGroom = "partner";
        direction.faceBride = "partner";
        direction.hug = 1;
        direction.celebrate = 0.25;
        direction.orbit = 0.0;
        direction.distance -= 0.6;
        break;
      case "walk":
        break;
      default:
        // rsvp, photoWall, rooms, custom sections: greet the guest.
        direction.faceGroom = camera;
        direction.faceBride = camera;
        direction.wave = 1;
        direction.waveBride = 1;
        direction.orbit = away * 0.35;
        direction.lookBias = 0.1;
    }

    if (this.tapReaction > 0) {
      direction.faceGroom = camera;
      direction.faceBride = camera;
      direction.wave = 1;
      direction.waveBride = 1;
    }
    return direction;
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
        this.spawnConfetti(middle.clone().setY(1.6));
        this.spawnHearts(middle.clone().setY(1.3), 6);
      }
    }
    if (direction.key === "story" && Math.random() < dt * 0.9) {
      this.spawnHearts(this.coupleCentre().setY(1.3), 1);
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

  private addShadow(root: Group, radius: number) {
    const shadow = new Mesh(new CircleGeometry(radius, 24), new MeshBasicMaterial({ color: "#7A5A50", transparent: true, opacity: 0.18, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    root.add(shadow);
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  // The camera orbits the couple: ahead of them (seeing their faces), swinging aside at stations.
  private computeCamera(direction: Direction | undefined, position: Vector3, look: Vector3) {
    const { tangent, side } = frameAt(this.coupleU);
    const centre = this.coupleCentre();
    const orbit = this.orbit + this.tilt.x * 0.25;
    const offset = tangent.clone().multiplyScalar(Math.cos(orbit)).addScaledVector(side, Math.sin(orbit));
    position.copy(centre).addScaledVector(offset, this.distance);
    position.y = 1.35 + this.tilt.y * 0.25 + (this.camera.aspect < 0.8 ? 0.15 : 0);
    look.copy(centre).setY(0.62);
    const prop = direction?.station?.focus;
    if (prop) look.lerp(prop.clone().setY(0.8), this.lookBias);

    if (this.intro !== "done" && this.introGroup) {
      // Fit the 1.5-wide envelope to the screen width (portrait phones are the narrow case).
      const halfFov = MathUtils.degToRad(this.camera.fov / 2);
      const fitWidth = 0.95 / (Math.tan(halfFov) * this.camera.aspect);
      const fitHeight = 1.0 / Math.tan(halfFov);
      const distance = Math.max(fitWidth, fitHeight, 2.2);
      // The envelope's front faces along the path, toward the camera that waits ahead of the couple.
      const front = frameAt(START_U).tangent;
      position.copy(this.introGroup.position).addScaledVector(front, distance).add(new Vector3(0, 0.05, 0));
      look.copy(this.introGroup.position).add(new Vector3(0, 0.12, 0));
    }
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

  // ── Intro: the envelope opens and the personal card slides out ────────────
  private buildIntro() {
    const group = new Group();
    const start = frameAt(START_U);
    // Hover just in front of the couple, facing the camera that waits ahead of them.
    group.position.copy(start.point).addScaledVector(start.tangent, 1.4).setY(1.25);
    group.rotation.y = Math.atan2(start.tangent.x, start.tangent.z);

    const body = new Mesh(new BoxGeometry(1.5, 1.0, 0.05), toon("#FBEFEA"));
    group.add(body);

    const texture = textCard(
      [
        { text: "Thân mời", font: FONTS.sans, weight: 500, color: PALETTE.moss, size: 30, gap: 2 },
        { text: this.data.guestName || "bạn", font: FONTS.script, color: PALETTE.son, size: 92, gap: 10 },
        { text: `${this.data.groom} & ${this.data.bride}`, font: FONTS.serif, weight: 600, color: PALETTE.moss, size: 44, gap: 4 },
        { text: this.data.dateText, font: FONTS.sans, weight: 500, color: PALETTE.moss, size: 26 },
      ],
      { width: 560, height: 400, background: PALETTE.paper, border: PALETTE.gold },
    );
    const card = new Mesh(new PlaneGeometry(1.32, 0.94), new MeshBasicMaterial({ map: texture }));
    card.position.set(0, 0, 0.03);
    this.card = card;
    group.add(card);

    // Front pocket with a V-shaped mouth like a real envelope; it hides the lower card until it rises.
    const pocketShape = new Shape();
    pocketShape.moveTo(-0.75, -0.5);
    pocketShape.lineTo(0.75, -0.5);
    pocketShape.lineTo(0.75, 0.2);
    pocketShape.lineTo(0, -0.12);
    pocketShape.lineTo(-0.75, 0.2);
    pocketShape.closePath();
    const pocket = new Mesh(new ShapeGeometry(pocketShape), new MeshBasicMaterial({ color: "#F4DAD3" }));
    pocket.position.z = 0.05;
    group.add(pocket);
    const foldShape = new Shape();
    foldShape.moveTo(-0.75, -0.5);
    foldShape.lineTo(0.75, -0.5);
    foldShape.lineTo(0, -0.02);
    foldShape.closePath();
    const fold = new Mesh(new ShapeGeometry(foldShape), new MeshBasicMaterial({ color: "#EDC8C0" }));
    fold.position.z = 0.052;
    group.add(fold);

    const flap = new Group();
    flap.position.set(0, 0.5, 0.055);
    const flapMesh = new Mesh(new ShapeGeometry(triangle(1.5, 0.62)), new MeshBasicMaterial({ color: "#F3D9D1", side: DoubleSide }));
    flap.add(flapMesh);
    const seal = hySign(0.2);
    seal.position.set(0, -0.48, 0.02);
    flap.add(seal);
    group.add(flap);
    this.flap = flap;

    this.introGroup = group;
    this.scene.add(group);
    this.introTime = 0;
    this.snapCamera();
  }

  private updateIntro(dt: number) {
    if (!this.introGroup || !this.flap || !this.card) return;
    this.introTime += dt;

    if (this.intro === "envelope" && this.introTime > 1.0) this.intro = "opening";
    if (this.intro === "opening" || this.intro === "card") {
      // Swing the flap backwards so it ends behind the rising card.
      this.flap.rotation.x = MathUtils.damp(this.flap.rotation.x, Math.PI * 0.97, 3.5, dt);
      if (this.flap.rotation.x > Math.PI * 0.55) {
        // Once the flap is up, the card rises above the pocket and comes forward.
        this.card.position.y = MathUtils.damp(this.card.position.y, 0.66, 2.6, dt);
        this.card.position.z = 0.09;
        // Record the moment only once: this block keeps running while the card is shown.
        if (this.card.position.y > 0.6 && this.intro !== "card") {
          this.intro = "card";
          this.cardShownAt = this.introTime;
        }
      }
    }
    if (this.intro === "card" && this.introTime - this.cardShownAt > 2.6) this.leaveIntro();
    if (this.intro === "leaving") {
      this.introGroup.position.y += dt * 2.4;
      this.introGroup.scale.multiplyScalar(1 - dt * 1.1);
      if (this.introGroup.scale.x < 0.12) {
        this.scene.remove(this.introGroup);
        this.introGroup = undefined;
        this.intro = "done";
        this.applyViewOffset();
      }
    }
  }

  private leaveIntro() {
    if (this.intro === "done" || this.intro === "leaving") return;
    this.intro = "leaving";
  }

  // ── Particles ─────────────────────────────────────────────────────────────
  private spawnHearts(origin: Vector3, count: number) {
    for (let index = 0; index < count; index++) {
      const mesh = new Mesh(HEART_GEOMETRY, flat(index % 2 ? PALETTE.son : "#F28FA0"));
      mesh.position.copy(origin).add(new Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.2, (Math.random() - 0.5) * 0.2));
      mesh.quaternion.copy(this.camera.quaternion);
      this.scene.add(mesh);
      this.hearts.push({ mesh, life: 1.6 + Math.random() * 0.6, velocity: new Vector3((Math.random() - 0.5) * 0.2, 0.55 + Math.random() * 0.3, 0) });
    }
  }

  private spawnConfetti(origin: Vector3) {
    const colors = [PALETTE.son, PALETTE.blush, PALETTE.gold, "#FFFFFF", "#9BC27F"];
    const count = this.options.lowPower ? 40 : 90;
    for (let index = 0; index < count; index++) {
      const mesh = new Mesh(CONFETTI_GEOMETRY, flat(colors[index % colors.length]));
      mesh.position.copy(origin);
      this.scene.add(mesh);
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 1.8;
      this.confetti.push({
        mesh,
        life: 2.5 + Math.random(),
        velocity: new Vector3(Math.cos(angle) * speed, 2 + Math.random() * 1.5, Math.sin(angle) * speed),
        spin: new Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
      });
    }
  }

  private updateParticles(dt: number) {
    for (let index = this.hearts.length - 1; index >= 0; index--) {
      const item = this.hearts[index];
      item.life -= dt;
      item.mesh.position.addScaledVector(item.velocity, dt);
      item.mesh.quaternion.copy(this.camera.quaternion);
      item.mesh.scale.setScalar(Math.min(1, item.life));
      if (item.life <= 0) {
        this.scene.remove(item.mesh);
        this.hearts.splice(index, 1);
      }
    }
    for (let index = this.confetti.length - 1; index >= 0; index--) {
      const item = this.confetti[index];
      item.life -= dt;
      item.velocity.y -= 3.2 * dt;
      item.velocity.multiplyScalar(1 - dt * 0.8);
      item.mesh.position.addScaledVector(item.velocity, dt);
      if (item.mesh.position.y < 0.02) item.mesh.position.y = 0.02;
      item.mesh.rotation.x += item.spin.x * dt;
      item.mesh.rotation.y += item.spin.y * dt;
      if (item.life <= 0) {
        this.scene.remove(item.mesh);
        this.confetti.splice(index, 1);
      }
    }
  }
}

const HEART_GEOMETRY = new ShapeGeometry(heart(0.09));
const CONFETTI_GEOMETRY = new PlaneGeometry(0.05, 0.08);

function triangle(width: number, height: number) {
  const shape = new Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, -height);
  shape.closePath();
  return shape;
}

function isDark(hex: string) {
  const value = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(value)) return false;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
}
