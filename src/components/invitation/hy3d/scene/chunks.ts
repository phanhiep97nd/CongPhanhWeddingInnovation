// Normalized arc-length helpers; no three.js or DOM dependency.
export function chunkIndex(u: number, count: number) {
  if (!Number.isInteger(count) || count < 1) return -1;
  const value = Number.isNaN(u) ? 0 : Math.min(1, Math.max(0, u));
  return Math.min(count - 1, Math.floor(value * count));
}

export function visibleChunks(cameraU: number, count: number, radius: number) {
  if (!Number.isInteger(count) || count < 1 || radius < 0) return [];
  const centre = Math.min(1, Math.max(0, cameraU));
  return Array.from({ length: count }, (_, index) => index)
    .filter((index) => Math.abs((index + 0.5) / count - centre) <= radius);
}
