import { Vector3 } from "three";
import type { Station } from "./world";

export interface Direction {
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
  focus?: Vector3;        // overrides the station prop as the look-at point (the new home at the end)
  distance: number;
  lookBias: number;       // 0 = look at the couple, 1 = look at the station prop
}

interface DirectionContext {
  stations: Station[];
  coupleU: number;
  cameraGoal: Vector3;
  camera: { aspect: number };
  tapReaction: number;
  homeFocus?: Vector3;
}

export function direct(context: DirectionContext, walking: number): Direction {
  let station: Station | undefined;
  let nearest = Infinity;
  for (const candidate of context.stations) {
    const distance = Math.abs(candidate.u - context.coupleU);
    if (distance < nearest) {
      nearest = distance;
      station = candidate;
    }
  }
  const settled = walking < 0.35;
  const atStation = station && nearest < 0.035 && settled ? station : undefined;
  const atEnd = context.coupleU > 0.97 - 0.02 && settled;
  const camera = context.cameraGoal;

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
    distance: context.camera.aspect < 0.8 ? 4.1 : 3.4,
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
      // Camera cranes up and over to behind the couple (round the side away from the house, never through it)
      // so their new home fills the background while they hug at the porch.
      direction.faceGroom = "partner";
      direction.faceBride = "partner";
      direction.hug = 1;
      direction.celebrate = 0.25;
      direction.orbit = -Math.PI * 1.2;
      direction.distance += 0.9;
      direction.lookBias = 0.35;
      direction.focus = context.homeFocus;
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

  if (context.tapReaction > 0) {
    direction.faceGroom = camera;
    direction.faceBride = camera;
    direction.wave = 1;
    direction.waveBride = 1;
  }
  return direction;
}
