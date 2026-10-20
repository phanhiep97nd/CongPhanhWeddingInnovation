export interface SceneData {
  groom: string;
  bride: string;
  guestName: string;
  dateText: string;
  venueName: string;
  colors: string[];
  stations: string[];          // enabled section keys in display order
  timeline: { time: string; title: string }[];
  photos: string[];            // gallery image URLs (already sized for textures)
}

export interface SceneOptions {
  background?: boolean;
  pixelRatioCap?: number;
  skipIntro?: boolean;
  lowPower?: boolean;
}

// ── Rendering policy ──
export function sceneOptionsFor(options: SceneOptions = {}) {
  const background = options.background ?? false;
  return {
    ...options,
    background,
    skipIntro: background || (options.skipIntro ?? false),
    taps: !background,
    tilt: !background,
    viewShift: !background,
    fpsCap: background ? 30 : undefined,
    pixelRatioCap: Math.min(options.pixelRatioCap ?? (options.lowPower ? 1.25 : 1.75), background ? 1.25 : Infinity),
    exposure: background ? 1.12 : 1.05,
    fogNear: background ? 8 : 10,
    fogFar: background ? 28 : 34,
  };
}

