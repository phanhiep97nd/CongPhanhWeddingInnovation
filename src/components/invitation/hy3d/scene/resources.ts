import { BufferGeometry } from "three";

const geometries = new Set<BufferGeometry>();

export function track<T extends BufferGeometry>(geometry: T) {
  geometries.add(geometry);
  return geometry;
}

export function disposeWorld() {
  geometries.forEach((geometry) => geometry.dispose());
  geometries.clear();
}

export function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}
