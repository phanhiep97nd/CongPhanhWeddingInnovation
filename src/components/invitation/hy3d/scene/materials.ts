import {
  BackSide,
  Color,
  DoubleSide,
  FrontSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type IUniform,
} from "three";

// ── Palette ───────────────────────────────────────────────────────────────────
// Brand "Hỷ Thiệp": son (lacquer rose), phấn (blush), giấy (paper), rêu (moss), kim (gold).
export const PALETTE = {
  son: "#A23B48",
  blush: "#F2C8CD",
  paper: "#FDF5F6",
  moss: "#3F5A2E",
  gold: "#C9A46A",
  skin: "#F2CDB8",
  cheek: "#EE9CA6",
  hairDark: "#241A18",
  hairBrown: "#35231F",
  eye: "#241A1A",
  suit: "#2C3550",
  trousers: "#232A3E",
  shirt: "#FFFFFF",
  dress: "#FFFBF6",
  grass: "#8FB46A",
  grassDeep: "#5E8743",
  path: "#D9C7B8",
  pathEdge: "#B89F8C",
  wood: "#7A5238",
  leaf: "#5F8F45",
  skyTop: "#F7D9DF",
  skyHorizon: "#FFF4EC",
};

// ── Physically based surfaces ─────────────────────────────────────────────────
// Every solid surface uses a standard (PBR) material so it reacts to the environment light and the
// soft sun shadows. Cached by look so meshes share materials.
const surfaceCache = new Map<string, MeshStandardMaterial>();

export interface SurfaceOptions {
  roughness?: number;
  metalness?: number;
  vertexColors?: boolean;
  transparent?: boolean;
  opacity?: number;
  doubleSide?: boolean;
  sheen?: boolean;          // fabric-like falloff for petals and the dress (emulated via emissive tint)
}

export function surface(color: string, options: SurfaceOptions = {}) {
  const key = `${color}|${JSON.stringify(options)}`;
  const cached = surfaceCache.get(key);
  if (cached) return cached;
  const material = new MeshStandardMaterial({
    color: new Color(color),
    roughness: options.roughness ?? 0.7,
    metalness: options.metalness ?? 0,
    vertexColors: options.vertexColors ?? false,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.doubleSide ? DoubleSide : FrontSide,
  });
  if (options.sheen) {
    material.emissive = new Color(color).multiplyScalar(0.06);
  }
  surfaceCache.set(key, material);
  return material;
}

// Kept for the character code: the chibi placeholders now use the same PBR surfaces.
export const toon = surface;

const flatCache = new Map<string, MeshBasicMaterial>();

export function flat(color: string, opacity = 1) {
  const key = `${color}|${opacity}`;
  const cached = flatCache.get(key);
  if (cached) return cached;
  const material = new MeshBasicMaterial({ color: new Color(color), transparent: opacity < 1, opacity });
  flatCache.set(key, material);
  return material;
}

// The cartoon outline hull is no longer drawn; kept so older call sites compile.
export const OUTLINE = new MeshBasicMaterial({ color: new Color("#4A2A2E"), side: BackSide });

// ── Wind ──────────────────────────────────────────────────────────────────────
// Grass and flowers sway in the vertex shader: the higher a vertex, the further it moves, with a
// phase taken from the instance position so a meadow ripples instead of moving in lockstep.
export const windUniform: IUniform<number> = { value: 0 };

export function withWind(material: MeshStandardMaterial, height: number, strength: number) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uWindTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float windHeight = clamp(position.y / ${height.toFixed(3)}, 0.0, 1.0);
        #ifdef USE_INSTANCING
          vec2 windBase = instanceMatrix[3].xz;
        #else
          vec2 windBase = vec2(0.0);
        #endif
        float windSway = sin(uWindTime * 1.7 + windBase.x * 0.9 + windBase.y * 0.7) * ${strength.toFixed(3)}
          + sin(uWindTime * 3.3 + windBase.x * 2.1) * ${(strength * 0.25).toFixed(3)};
        transformed.x += windSway * windHeight * windHeight;
        transformed.z += windSway * 0.6 * windHeight * windHeight;`,
      );
  };
  material.customProgramCacheKey = () => `wind-${height}-${strength}`;
  return material;
}

export function disposeMaterials() {
  surfaceCache.forEach((material) => material.dispose());
  flatCache.forEach((material) => material.dispose());
  surfaceCache.clear();
  flatCache.clear();
  OUTLINE.dispose();
}
