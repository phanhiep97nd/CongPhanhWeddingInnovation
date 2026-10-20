import { InstancedMesh, Object3D, Vector3 } from "three";
import { fallingPetalGeometry } from "./flowers";
import { surface } from "./materials";
import { track, seeded } from "./resources";

// ── Falling petals ────────────────────────────────────────────────────────────
export class Petals {
  readonly mesh: InstancedMesh;
  private readonly items: { position: Vector3; speed: number; spin: Vector3; phase: number }[] = [];
  private readonly dummy = new Object3D();
  private readonly random = seeded(11);

  constructor(count: number) {
    this.mesh = new InstancedMesh(track(fallingPetalGeometry()), surface("#FFFFFF", { vertexColors: true, roughness: 0.7, doubleSide: true }), count);
    for (let index = 0; index < count; index++) {
      this.items.push({
        position: new Vector3((this.random() - 0.5) * 8, this.random() * 5, (this.random() - 0.5) * 8),
        speed: 0.25 + this.random() * 0.35,
        spin: new Vector3(this.random(), this.random(), this.random()).multiplyScalar(2),
        phase: this.random() * Math.PI * 2,
      });
    }
    this.mesh.frustumCulled = false;
  }

  // Petals live in a box that follows the camera target, wrapping vertically.
  update(dt: number, time: number, centre: Vector3) {
    this.items.forEach((item, index) => {
      item.position.y -= item.speed * dt;
      if (item.position.y < 0) item.position.y += 5;
      const x = centre.x + item.position.x + Math.sin(time * 0.8 + item.phase) * 0.4;
      const z = centre.z + item.position.z;
      this.dummy.position.set(x, item.position.y, z);
      this.dummy.rotation.set(time * item.spin.x, time * item.spin.y, time * item.spin.z);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(index, this.dummy.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

