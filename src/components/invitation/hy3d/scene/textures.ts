import { CanvasTexture, SRGBColorSpace, Texture, TextureLoader } from "three";

// Fonts already used by the invitation (loaded through invitation.css).
export const FONTS = {
  script: '"Great Vibes", cursive',
  serif: '"Cormorant Garamond", "Noto Serif", serif',
  sans: '"Plus Jakarta Sans", sans-serif',
};

export async function ensureFonts() {
  if (!("fonts" in document)) return;
  await Promise.allSettled([
    document.fonts.load(`64px ${FONTS.script}`, "Thân mời"),
    document.fonts.load(`600 64px ${FONTS.serif}`, "Hỷ Thiệp"),
    document.fonts.load(`500 32px ${FONTS.sans}`, "Lễ thành hôn"),
  ]);
}

export interface TextLine {
  text: string;
  font: string;
  weight?: number;   // CSS font-weight; must precede the size in the canvas font string
  color: string;
  size: number;      // px on the canvas
  gap?: number;      // space after the line
}

// Draws centred lines on a paper-coloured card and returns it as a texture.
export function textCard(lines: TextLine[], options: { width: number; height: number; background?: string; border?: string; radius?: number }) {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = options.width * scale;
  canvas.height = options.height * scale;
  const context = canvas.getContext("2d")!;
  context.scale(scale, scale);

  const radius = options.radius ?? 18;
  if (options.background) {
    context.fillStyle = options.background;
    roundedRect(context, 0, 0, options.width, options.height, radius);
    context.fill();
  }
  if (options.border) {
    context.strokeStyle = options.border;
    context.lineWidth = 3;
    roundedRect(context, 10, 10, options.width - 20, options.height - 20, Math.max(radius - 8, 4));
    context.stroke();
  }

  const total = lines.reduce((sum, line) => sum + line.size * 1.15 + (line.gap ?? 8), 0);
  let y = (options.height - total) / 2;
  context.textAlign = "center";
  context.textBaseline = "top";
  for (const line of lines) {
    context.font = `${line.weight ?? 400} ${line.size}px ${line.font}`;
    context.fillStyle = line.color;
    fitText(context, line.text, options.width - 40, line);
    context.fillText(line.text, options.width / 2, y);
    y += line.size * 1.15 + (line.gap ?? 8);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number, line: TextLine) {
  let size = line.size;
  while (size > 12 && context.measureText(text).width > maxWidth) {
    size -= 2;
    context.font = context.font.replace(/\d+px/, `${size}px`);
  }
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

const loader = new TextureLoader();
loader.setCrossOrigin("anonymous");

export function loadPhoto(url: string, onLoad: (texture: Texture) => void) {
  return loader.load(url, (texture) => {
    texture.colorSpace = SRGBColorSpace;
    onLoad(texture);
  });
}
