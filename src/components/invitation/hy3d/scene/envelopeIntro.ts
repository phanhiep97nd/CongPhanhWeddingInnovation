import { disposeModel } from "./disposeTree";
import { BoxGeometry, DoubleSide, Group, MathUtils, Mesh, MeshBasicMaterial, PlaneGeometry, Scene, Shape, ShapeGeometry, Vector3 } from "three";
import { PALETTE, toon } from "./materials";
import { FONTS, textCard } from "./textures";
import { frameAt } from "./path";
import { hySign } from "./props";
import type { SceneData } from "./WeddingScene";

export type IntroPhase = "envelope" | "opening" | "card" | "leaving" | "done";
const START_U = 0.02;

export class EnvelopeIntro {
  group?: Group;
  phase: IntroPhase;
  private flap?: Group;
  private card?: Mesh;
  private introTime = 0;
  private cardShownAt = 0;

  constructor(
    private readonly scene: Scene,
    private readonly data: SceneData,
    skip: boolean,
    private readonly snapCamera: () => void,
    private readonly applyViewOffset: () => void,
  ) {
    this.phase = skip ? "done" : "envelope";
  }

  build() {
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

    this.group = group;
    this.scene.add(group);
    this.introTime = 0;
    this.snapCamera();
  }

  update(dt: number) {
    if (!this.group || !this.flap || !this.card) return;
    this.introTime += dt;

    if (this.phase === "envelope" && this.introTime > 1.0) this.phase = "opening";
    if (this.phase === "opening" || this.phase === "card") {
      // Swing the flap backwards so it ends behind the rising card.
      this.flap.rotation.x = MathUtils.damp(this.flap.rotation.x, Math.PI * 0.97, 3.5, dt);
      if (this.flap.rotation.x > Math.PI * 0.55) {
        // Once the flap is up, the card rises above the pocket and comes forward.
        this.card.position.y = MathUtils.damp(this.card.position.y, 0.66, 2.6, dt);
        this.card.position.z = 0.09;
        // Record the moment only once: this block keeps running while the card is shown.
        if (this.card.position.y > 0.6 && this.phase !== "card") {
          this.phase = "card";
          this.cardShownAt = this.introTime;
        }
      }
    }
    if (this.phase === "card" && this.introTime - this.cardShownAt > 2.6) this.leave();
    if (this.phase === "leaving") {
      this.group.position.y += dt * 2.4;
      this.group.scale.multiplyScalar(1 - dt * 1.1);
      if (this.group.scale.x < 0.12) {
        this.dispose();
        this.phase = "done";
        this.applyViewOffset();
      }
    }
  }

  dispose() {
    if (!this.group) return;
    this.group.removeFromParent();
    disposeModel(this.group);
    this.group = undefined;
  }

  leave() {
    if (this.phase === "done" || this.phase === "leaving") return;
    this.phase = "leaving";
  }

}

function triangle(width: number, height: number) {
  const shape = new Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, -height);
  shape.closePath();
  return shape;
}

