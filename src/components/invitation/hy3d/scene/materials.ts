import {
  BackSide,
  Color,
  DataTexture,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
} from "three";

// ── Palette ───────────────────────────────────────────────────────────────────
// Brand "Hỷ Thiệp": son (lacquer rose), phấn (blush), giấy (paper), rêu (moss), kim (gold).
export const PALETTE = {
  son: "#A23B48",
  blush: "#F2C8CD",
  paper: "#FDF5F6",
  moss: "#3F5A2E",
  gold: "#C9A46A",
  skin: "#F6D2BE",
  cheek: "#F29AA6",
  hairDark: "#2B1F1D",
  hairBrown: "#3B2622",
  eye: "#2A1E1E",
  suit: "#2F3A55",
  trousers: "#262E44",
  shirt: "#FFFFFF",
  dress: "#FFF9F4",
  grass: "#C9DDB1",
  grassDeep: "#A9C68C",
  path: "#F4DDD3",
  pathEdge: "#E8C7BA",
  wood: "#9C6B4E",
  leaf: "#7FA36A",
};

// A three-step gradient gives the soft cel-shaded look of picture-book characters.
let toonRamp: DataTexture | null = null;

function ramp() {
  if (toonRamp) return toonRamp;
  const steps = new Uint8Array([165, 220, 255]);
  toonRamp = new DataTexture(steps, steps.length, 1, RedFormat);
  toonRamp.minFilter = NearestFilter;
  toonRamp.magFilter = NearestFilter;
  toonRamp.generateMipmaps = false;
  toonRamp.needsUpdate = true;
  return toonRamp;
}

const toonCache = new Map<string, MeshToonMaterial>();

export function toon(color: string, options: { transparent?: boolean; opacity?: number } = {}) {
  const key = `${color}|${options.opacity ?? 1}`;
  const cached = toonCache.get(key);
  if (cached) return cached;
  const material = new MeshToonMaterial({
    color: new Color(color),
    gradientMap: ramp(),
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
  toonCache.set(key, material);
  return material;
}

const flatCache = new Map<string, MeshBasicMaterial>();

export function flat(color: string, opacity = 1) {
  const key = `${color}|${opacity}`;
  const cached = flatCache.get(key);
  if (cached) return cached;
  const material = new MeshBasicMaterial({ color: new Color(color), transparent: opacity < 1, opacity });
  flatCache.set(key, material);
  return material;
}

// Inverted-hull outline: a slightly larger back-faced copy drawn in a warm dark tone.
export const OUTLINE = new MeshBasicMaterial({ color: new Color("#4A2A2E"), side: BackSide });

export function disposeMaterials() {
  toonCache.forEach((material) => material.dispose());
  flatCache.forEach((material) => material.dispose());
  toonCache.clear();
  flatCache.clear();
  OUTLINE.dispose();
  toonRamp?.dispose();
  toonRamp = null;
}
