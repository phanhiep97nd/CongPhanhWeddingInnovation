import { Group, InstancedMesh, Matrix4, Mesh, Object3D, Scene, Vector3 } from "three";
import type { SceneData } from "./WeddingScene";
import { buildGround } from "./ground";
import { buildPlanting } from "./planting";
import { bench, colourFlags, flowerArch, lantern, photoFrame, redEnvelope, signpost } from "./props";
import { frameAt, stationPositions } from "./path";
import { mergeStatic } from "./mergeStatic";
import { chunkIndex } from "./chunks";
import { PATH } from "./path";
import { plantingChunkCount } from "./chunkInstances";

export { clamp01, frameAt, PATH, stationPositions } from "./path";
export { disposeWorld } from "./resources";
export { Petals } from "./petals";
export { heart, hySign, redEnvelope } from "./props";

const up = new Vector3(0, 1, 0);

// ── Stations ──────────────────────────────────────────────────────────────────
export interface Station {
  key: string;
  u: number;
  side: number;          // +1 left of the walker, -1 right
  focus: Vector3;        // what the couple looks at
  object: Group;
}

function placeBeside(object: Object3D, u: number, sideSign: number, distance: number) {
  const { point, side, tangent } = frameAt(u);
  object.position.copy(point).addScaledVector(side, sideSign * distance);
  object.quaternion.setFromRotationMatrix(new Matrix4().lookAt(new Vector3(), tangent.clone().negate().addScaledVector(side, sideSign * 0.9), up));
}

export function buildStations(data: SceneData, lowPower = false): Station[] {
  const positions = stationPositions(data.stations.length);
  return data.stations.map((key, index) => {
    const u = positions[index];
    const sideSign = index % 2 === 0 ? 1 : -1;
    const object = new Group();
    const focus = new Vector3();

    if (key === "story") {
      const prop = bench();
      placeBeside(prop, u - 0.012, sideSign, 1.5);
      object.add(prop);
    } else if (key === "timeline") {
      const items = data.timeline.length ? data.timeline.slice(0, 5) : [{ time: data.dateText, title: "Ngày cưới" }];
      items.forEach((item, itemIndex) => {
        const post = signpost(item.time, item.title);
        placeBeside(post, u - 0.006 - itemIndex * 0.011, itemIndex % 2 === 0 ? sideSign : -sideSign, 1.55);
        object.add(post);
      });
    } else if (key === "gallery") {
      const photos = data.photos.length ? data.photos.slice(0, 6) : [undefined, undefined];
      photos.forEach((url, photoIndex) => {
        const frame = photoFrame(url);
        placeBeside(frame, u - 0.004 - photoIndex * 0.01, photoIndex % 2 === 0 ? 1 : -1, 1.6);
        object.add(frame);
      });
    } else if (key === "info") {
      const arch = flowerArch(data, lowPower);
      const { point, tangent } = frameAt(u - 0.016);
      arch.position.copy(point);
      // Face forward: the camera waits ahead of the couple, looking back at them and the gate.
      arch.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), tangent.clone());
      arch.traverse((child) => {
        if (child instanceof Mesh && !(child instanceof InstancedMesh)) child.castShadow = !lowPower;
      });
      object.add(arch);
    } else if (key === "giftBox") {
      const envelope = redEnvelope();
      placeBeside(envelope, u - 0.008, sideSign, 1.2);
      envelope.position.y = 1.1;
      envelope.userData.float = true;
      object.add(envelope);
    } else if (key === "dressCode") {
      const flags = colourFlags(data.colors);
      placeBeside(flags, u - 0.012, sideSign, 1.5);
      object.add(flags);
    } else {
      const prop = lantern();
      placeBeside(prop, u - 0.01, sideSign, 1.3);
      object.add(prop);
    }

    const anchor = object.children[0];
    if (anchor) focus.copy(anchor.position).setY(1);
    if (key === "giftBox") {
      if (anchor instanceof Group) mergeStatic(anchor);
    } else {
      mergeStatic(object);
    }
    return { key, u, side: sideSign, focus, object };
  });
}

import { newHome, placeLandmarks, weddingBackdrop } from "./landmarks";

export function buildWorld(scene: Scene, data: SceneData, lowPower = false) {
  const ground = buildGround(lowPower);
  const planting = buildPlanting(lowPower);
  const stations = buildStations(data, lowPower);
  const count = plantingChunkCount(lowPower);
  const batches = Array.from({ length: count }, (_, chunk) => {
    const batch = new Group();
    batch.userData.chunk = chunk;
    batch.userData.chunkCount = count;
    batch.userData.centre = PATH.getPointAt((chunk + 0.5) / count);
    return batch;
  });
  // Share timber, frame metal and lantern materials across adjacent stations, too.
  stations.forEach((station) => {
    if (station.key === "giftBox") scene.add(station.object);
    else batches[chunkIndex(station.u, count)].add(station.object);
  });
  batches.forEach((batch) => planting.add(mergeStatic(batch)));
  scene.add(ground, planting);

  // Landmarks framing the walk: the wedding backdrop behind the start, the new home at the end.
  const backdrop = weddingBackdrop(data, lowPower);
  const home = newHome(lowPower);
  placeLandmarks(backdrop, home);
  scene.add(backdrop, home.root);
  return { stations, planting, home, landmarks: [backdrop, home.root] };
}

// Small helper for gentle bobbing of floating props.
export function floatProps(stations: Station[], time: number) {
  for (const station of stations) {
    station.object.traverse((child) => {
      if (child.userData.float) {
        child.position.y = 1.1 + Math.sin(time * 1.6) * 0.06;
        child.rotation.y = Math.sin(time * 0.8) * 0.4;
      }
    });
  }
}

