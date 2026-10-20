import type { Wedding } from "../../lib/types";
const fallback = ["#F2C8CD", "#8DA06B", "#D4C5A9", "#1a1a1a"];

function BrideFigure({ colors }: { colors: string[] }) {
  return (
    <svg viewBox="0 0 100 212" className="dress-figure" role="img" aria-label="Gợi ý trang phục cô dâu">
      <ellipse cx="50" cy="32" rx="19" ry="21" fill="#4a3728" />
      <circle cx="50" cy="34" r="16" fill="#f5c9a0" />
      <path d="M44 48 L56 48 L57 60 L43 60 Z" fill="#f5c9a0" />
      <path d="M30 58 Q50 50 70 58 L73 92 Q50 98 27 92 Z" fill={colors[0]} />
      <path d="M27 88 Q50 96 73 88 L90 198 L10 198 Z" fill={colors[1]} />
      <path d="M27 90 Q50 97 73 90" stroke={colors[2]} strokeWidth="4" />
      <path d="M30 64 Q14 80 16 100 M70 64 Q86 80 84 100" stroke="#f5c9a0" strokeWidth="10" strokeLinecap="round" />
      <circle cx="14" cy="106" r="10" fill={colors[0]} />
      <circle cx="23" cy="99" r="8" fill={colors[1]} />
      <ellipse cx="29" cy="201" rx="13" ry="5" fill={colors[3]} />
      <ellipse cx="71" cy="201" rx="13" ry="5" fill={colors[3]} />
    </svg>
  );
}

function GroomFigure({ colors }: { colors: string[] }) {
  return (
    <svg viewBox="0 0 90 210" className="dress-figure" role="img" aria-label="Gợi ý trang phục chú rể">
      <ellipse cx="45" cy="28" rx="16" ry="18" fill="#3a2a1a" />
      <circle cx="45" cy="30" r="15" fill="#d4956a" />
      <path d="M39 43 L51 43 L52 54 L38 54 Z" fill="#d4956a" />
      <path d="M30 52 Q45 46 60 52 L62 100 Q45 104 28 100 Z" fill={colors[2]} />
      <path d="M14 58 L30 52 L30 118 L14 118 Z M60 52 L76 58 L76 118 L60 118 Z" fill={colors[3]} />
      <path d="M42 52 L48 52 L50 78 L45 92 L40 78 Z" fill={colors[1]} />
      <rect x="14" y="120" width="28" height="82" rx="3" fill={colors[3]} />
      <rect x="48" y="120" width="28" height="82" rx="3" fill={colors[3]} />
      <path d="M14 62 Q2 84 6 108 M76 62 Q88 84 84 108" stroke={colors[3]} strokeWidth="13" strokeLinecap="round" />
    </svg>
  );
}

export default function DressCode({ wedding }: { wedding: Wedding }) {
  const colors = wedding.dressCode.colors.length ? wedding.dressCode.colors : fallback;
  const palette = [0, 1, 2, 3].map((index) => colors[index] || fallback[index]);
  return (
    <section className="invite-section blush-section" id="dressCode">
      <h2>Trang phục</h2>
      <p className="preserve-lines">{wedding.dressCode.note}</p>
      <div className="dress-figures">
        <BrideFigure colors={palette} />
        <GroomFigure colors={palette} />
      </div>
      <div className="color-swatches" aria-label="Bảng màu trang phục">
        {palette.map((color, index) => <span key={index} title={color} style={{ background: color }} />)}
      </div>
    </section>
  );
}
