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
  pixelRatioCap?: number;
  skipIntro?: boolean;
  lowPower?: boolean;
}

