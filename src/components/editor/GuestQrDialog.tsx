import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export default function GuestQrDialog({ name, link, onClose }: { name: string; link: string; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    QRCode.toDataURL(link, { width: 320, margin: 2 }).then(setDataUrl).catch(() => setError("Không tạo được mã QR."));
  }, [link]);
  useEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      dialog.current?.close();
    };
  }, []);
  return <dialog ref={dialog} className="mobile-dialog qr-dialog" aria-label={`Mã QR của ${name}`} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="dialog-content editor-stack">
      <div className="dialog-handle" aria-hidden="true" />
      <div className="dialog-heading"><h2>Mã QR của {name}</h2><button onClick={onClose} aria-label="Đóng">×</button></div>
      {dataUrl ? <img className="qr-image" src={dataUrl} alt={`Mã QR mở thiệp của ${name}`} /> : <p>{error || "Đang tạo mã QR…"}</p>}
      <p className="qr-link">{link}</p>
      {dataUrl && <a className="button" href={dataUrl} download={`qr-${name}.png`}>Tải PNG</a>}
    </div>
  </dialog>;
}
