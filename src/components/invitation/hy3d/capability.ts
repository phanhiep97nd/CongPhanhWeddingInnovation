// WebGL + motion preference check. Phones without WebGL, or guests who asked for less motion,
// get the 2D layout instead of an empty canvas.
export function canRender3d() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
