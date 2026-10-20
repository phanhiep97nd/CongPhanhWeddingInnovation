import { Color, InstancedMesh, Object3D, PerspectiveCamera, PlaneGeometry, Scene, ShapeGeometry, Vector3 } from "three";
import { flat, PALETTE } from "./materials";
import { heart } from "./props";

interface Particle {
  position: Vector3;
  velocity: Vector3;
  spin: Vector3;
  rotation: Vector3;
  life: number;
  color: Color;
}

export class CelebrationParticles {
  private readonly hearts: Particle[] = [];
  private readonly confetti: Particle[] = [];
  private readonly heartMesh = new InstancedMesh(new ShapeGeometry(heart(0.09)), flat("#FFFFFF"), 24);
  private readonly confettiMesh: InstancedMesh;
  private readonly dummy = new Object3D();

  constructor(scene: Scene, private readonly lowPower: boolean) {
    this.confettiMesh = new InstancedMesh(new PlaneGeometry(0.05, 0.08), flat("#FFFFFF"), lowPower ? 40 : 90);
    for (const mesh of [this.heartMesh, this.confettiMesh]) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      scene.add(mesh);
    }
  }

  spawnHearts(origin: Vector3, count: number) {
    for (let index = 0; index < count && this.hearts.length < 24; index++) {
      this.hearts.push({
        position: origin.clone().add(new Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.2, (Math.random() - 0.5) * 0.2)),
        velocity: new Vector3((Math.random() - 0.5) * 0.2, 0.55 + Math.random() * 0.3, 0),
        spin: new Vector3(), rotation: new Vector3(), life: 1.6 + Math.random() * 0.6,
        color: new Color(index % 2 ? PALETTE.son : "#F28FA0"),
      });
    }
  }

  spawnConfetti(origin: Vector3) {
    const colors = [PALETTE.son, PALETTE.blush, PALETTE.gold, "#FFFFFF", "#9BC27F"];
    const count = this.lowPower ? 40 : 90;
    for (let index = 0; index < count; index++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 1.8;
      this.confetti.push({
        position: origin.clone(),
        velocity: new Vector3(Math.cos(angle) * speed, 2 + Math.random() * 1.5, Math.sin(angle) * speed),
        spin: new Vector3(Math.random() * 8, Math.random() * 8, 0), rotation: new Vector3(),
        life: 2.5 + Math.random(), color: new Color(colors[index % colors.length]),
      });
    }
  }

  update(dt: number, camera: PerspectiveCamera) {
    this.updateBatch(this.hearts, this.heartMesh, dt, camera, true);
    this.updateBatch(this.confetti, this.confettiMesh, dt, camera, false);
  }

  private updateBatch(items: Particle[], mesh: InstancedMesh, dt: number, camera: PerspectiveCamera, hearts: boolean) {
    let count = 0;
    for (let index = items.length - 1; index >= 0; index--) {
      const item = items[index];
      item.life -= dt;
      if (item.life <= 0) {
        items.splice(index, 1);
        continue;
      }
      if (!hearts) {
        item.velocity.y -= 3.2 * dt;
        item.velocity.multiplyScalar(1 - dt * 0.8);
      }
      item.position.addScaledVector(item.velocity, dt);
      if (!hearts) item.position.y = Math.max(0.02, item.position.y);
      this.dummy.position.copy(item.position);
      if (hearts) this.dummy.quaternion.copy(camera.quaternion);
      else {
        item.rotation.addScaledVector(item.spin, dt);
        this.dummy.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
      }
      this.dummy.scale.setScalar(hearts ? Math.min(1, item.life) : 1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(count, this.dummy.matrix);
      mesh.setColorAt(count++, item.color);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.visible = count > 0;
  }

  dispose() {
    for (const mesh of [this.heartMesh, this.confettiMesh]) {
      mesh.geometry.dispose();
      mesh.dispose();
    }
  }
}
