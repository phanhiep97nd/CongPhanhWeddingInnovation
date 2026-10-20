import { useState } from "react";

interface EyeDropperLike { open: () => Promise<{ sRGBHex: string }> }
interface EyeDropperWindow extends Window { EyeDropper?: new () => EyeDropperLike }

function ColorRow({ color, index, onChange, onRemove }: {
  key?: string | number;
  color: string;
  index: number;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  const [hex, setHex] = useState(color);
  const valid = /^#[0-9a-f]{6}$/i.test(hex);
  return <div className="dress-color-row">
    <label className="color-swatch-label">Màu {index + 1}
      <input aria-label={`Chọn màu ${index + 1}`} type="color" value={valid ? hex : "#ffffff"} onChange={event => { setHex(event.target.value); onChange(event.target.value); }} />
    </label>
    <label>Mã màu {index + 1}
      <input value={hex} aria-invalid={!valid} onChange={event => {
        const value = event.target.value;
        setHex(value);
        if (/^#[0-9a-f]{6}$/i.test(value)) onChange(value);
      }} />
    </label>
    <button type="button" onClick={onRemove} aria-label={`Xóa màu ${index + 1}`}>Xóa</button>
  </div>;
}

export default function DressColors({ colors, onChange }: { colors: string[]; onChange: (colors: string[]) => void }) {
  const [error, setError] = useState("");
  const eyeDropper = (window as EyeDropperWindow).EyeDropper;

  async function pickFromImage() {
    if (!eyeDropper || colors.length >= 12) return;
    try {
      const result = await new eyeDropper().open();
      onChange([...colors, result.sRGBHex]);
      setError("");
    } catch { setError("Chưa chọn được màu từ ảnh."); }
  }

  return <div className="full editor-stack">
    <h3>Màu trang phục</h3>
    <div className="dress-preview" aria-label="Màu trên thiệp">
      {colors.map((color, index) => <span key={`${index}-${color}`} style={{ backgroundColor: color }} title={color} />)}
    </div>
    {colors.map((color, index) => <ColorRow key={`${index}-${color}`} color={color} index={index}
      onChange={value => onChange(colors.map((item, i) => i === index ? value : item))}
      onRemove={() => onChange(colors.filter((_, i) => i !== index))} />)}
    <div className="actions">
      <button className="button-outline" type="button" disabled={colors.length >= 12} onClick={() => onChange([...colors, "#c9848b"])}>Thêm màu</button>
      {eyeDropper && <button className="button-outline" type="button" disabled={colors.length >= 12} onClick={() => void pickFromImage()}>Lấy màu từ ảnh</button>}
    </div>
    {error && <p role="alert" className="error">{error}</p>}
  </div>;
}
