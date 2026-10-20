import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function GuestQrDialog({ name, link, onClose }: { name: string; link: string; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    QRCode.toDataURL(link, { width: 320, margin: 2 }).then(setDataUrl).catch(() => setError("Không tạo được mã QR."));
  }, [link]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-card editor-stack" role="dialog" aria-modal="true" aria-label={`Mã QR của ${name}`}>
      <h2>Mã QR của {name}</h2>
      {dataUrl ? <img className="qr-image" src={dataUrl} alt={`Mã QR mở thiệp của ${name}`} /> : <p>{error || "Đang tạo mã QR…"}</p>}
      <p className="qr-link">{link}</p>
      <div className="actions">
        {dataUrl && <a className="button" href={dataUrl} download={`qr-${name}.png`}>Tải PNG</a>}
        <button autoFocus onClick={onClose}>Đóng</button>
      </div>
    </div>
  </div>;
}
