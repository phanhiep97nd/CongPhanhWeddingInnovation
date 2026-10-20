import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Wedding } from "../../lib/types";

const presets = ["#e8b4ba", "#ead9b0", "#9caf88", "#8faabd", "#fff8e7", "#c46f50", "#263854", "#752f43", "#b9a0cd", "#b7d9c1", "#d7c5aa", "#af849b", "#c5a352", "#ffffff", "#202020", "#8c8c8c"];
const validHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

interface EyeDropperWindow extends Window {
  EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
}

function ColorRow({ color, index, onChange, onRemove }: { key?: number; color: string; index: number; onChange: (value: string) => void; onRemove: () => void }) {
  const [hex, setHex] = useState(color);
  return <div className="dress-color-row">
    <label className="color-swatch-label">Màu {index + 1}
      <span className="color-swatch" style={{ backgroundColor: color }}>
        <span aria-hidden="true">✎</span>
        <input aria-label={`Chọn màu ${index + 1}`} type="color" value={validHex(color) ? color : "#ffffff"} onChange={event => { setHex(event.target.value); onChange(event.target.value); }} />
      </span>
    </label>
    <details>
      <summary>Nhập mã màu</summary>
      <label>Mã màu {index + 1}
        <input value={hex} aria-invalid={!validHex(hex)} onChange={event => {
          setHex(event.target.value);
          if (validHex(event.target.value)) onChange(event.target.value);
        }} />
      </label>
    </details>
    <button className="color-remove" type="button" onClick={onRemove} aria-label={`Xóa màu ${index + 1}`}>×</button>
  </div>;
}

export default function DressColors({ colors, onChange, wedding }: { colors: string[]; onChange: (colors: string[]) => void; wedding?: Wedding }) {
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState(false);
  const [sample, setSample] = useState("");
  const [magnifier, setMagnifier] = useState("");
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const photos = [
    ...(wedding?.coverImage ? [{ label: "Ảnh bìa", url: wedding.coverImage }] : []),
    ...(wedding?.story.image ? [{ label: "Ảnh câu chuyện", url: wedding.story.image }] : []),
    ...(wedding?.gallery || []).filter(photo => photo.url).map((photo, index) => ({ label: photo.title || `Ảnh ${index + 1}`, url: photo.url })),
  ];
  useEffect(() => {
    const element = dialog.current;
    if (sheet && element && !element.open) element.showModal();
    if (!sheet && element?.open) element.close();
  }, [sheet]);
  useEffect(() => {
    if (!sheet) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [sheet]);

  async function pickFromImage() {
    if (colors.length >= 12) return;
    const EyeDropper = (window as EyeDropperWindow).EyeDropper;
    if (EyeDropper) {
      try {
        const result = await new EyeDropper().open();
        onChange([...colors, result.sRGBHex]);
        setError("");
      } catch { setError("Chưa chọn được màu từ ảnh."); }
      return;
    }
    setSheet(true);
  }

  function samplePhoto(event: MouseEvent<HTMLImageElement>) {
    try {
      const image = event.currentTarget;
      const rect = image.getBoundingClientRect();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      context.drawImage(image, 0, 0);
      const x = Math.max(0, Math.min(canvas.width - 1, Math.floor((event.clientX - rect.left) / rect.width * canvas.width)));
      const y = Math.max(0, Math.min(canvas.height - 1, Math.floor((event.clientY - rect.top) / rect.height * canvas.height)));
      const pixels = context.getImageData(x, y, 1, 1).data;
      setSample(`#${Array.from(pixels.slice(0, 3)).map(value => value.toString(16).padStart(2, "0")).join("")}`);
      try {
        const lens = document.createElement("canvas");
        lens.width = 72;
        lens.height = 72;
        const lensContext = lens.getContext("2d");
        if (lensContext) {
          lensContext.imageSmoothingEnabled = false;
          lensContext.drawImage(image, x - 4, y - 4, 9, 9, 0, 0, 72, 72);
          setMagnifier(lens.toDataURL());
        }
      } catch { setMagnifier(""); }
      setError("");
    } catch { setError("Không đọc được màu ảnh này. Hãy thử ảnh khác."); }
  }

  return <div className="full editor-stack">
    <h3>Màu trang phục</h3>
    <div className="dress-preview" aria-label="Màu trên thiệp">
      {colors.map((color, index) => <span key={`${index}-${color}`} style={{ backgroundColor: color }} title={color} />)}
    </div>
    {colors.map((color, index) => <ColorRow key={index} color={color} index={index}
      onChange={value => onChange(colors.map((item, i) => i === index ? value : item))}
      onRemove={() => onChange(colors.filter((_, i) => i !== index))} />)}
    <p>Chọn màu có sẵn</p>
    <div className="color-presets">
      {presets.map((color, index) => <button key={color} type="button" disabled={colors.length >= 12} aria-label={`Thêm màu có sẵn ${index + 1}`} title={color} style={{ backgroundColor: color }} onClick={() => onChange([...colors, color])} />)}
    </div>
    <div className="actions">
      <button className="button-outline" type="button" disabled={colors.length >= 12} onClick={() => onChange([...colors, "#c9848b"])}>Thêm màu</button>
      <button className="button-outline" type="button" disabled={colors.length >= 12} onClick={() => void pickFromImage()}>Lấy màu từ ảnh</button>
    </div>
    <small>Tối đa 12 màu</small>
    {error && <p role="alert" className="error">{error}</p>}
    <dialog ref={dialog} className="mobile-dialog photo-color-dialog" onClose={() => setSheet(false)} onClick={event => { if (event.target === dialog.current) setSheet(false); }} aria-label="Lấy màu từ ảnh">
      <div className="dialog-content editor-stack">
        <div className="dialog-handle" aria-hidden="true" />
        <div className="dialog-heading"><h3>Lấy màu từ ảnh</h3><button type="button" aria-label="Đóng" onClick={() => setSheet(false)}>×</button></div>
        {photos.length ? <>
          <label>Chọn ảnh
            <select value={selected} onChange={event => { setSelected(Number(event.target.value)); setSample(""); }}>
              {photos.map((photo, index) => <option key={`${photo.url}-${index}`} value={index}>{photo.label}</option>)}
            </select>
          </label>
          <p>Chạm vào vị trí trên ảnh để lấy màu.</p>
          <img src={photos[selected]?.url} crossOrigin="anonymous" alt={photos[selected]?.label} onClick={samplePhoto} />
          {sample && <div className="sample-result"><span aria-label="Màu được chọn" style={{ backgroundColor: sample, backgroundImage: magnifier ? `url(${magnifier})` : undefined }} /> <strong>{sample}</strong><button className="button" onClick={() => { onChange([...colors, sample]); setSheet(false); }}>Dùng màu này</button></div>}
        </> : <p>Thêm ảnh bìa, ảnh câu chuyện hoặc ảnh bộ sưu tập trước khi lấy màu.</p>}
      </div>
    </dialog>
  </div>;
}
