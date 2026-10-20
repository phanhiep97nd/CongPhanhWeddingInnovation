import { useEffect, useState, type FormEvent } from "react";
import { Camera, Upload, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { api, json } from "../../lib/api";
import { uploadImage } from "../../lib/images";
import type { Photo } from "../../lib/types";

export function timeAgo(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export function UploadPopup({ slug, defaultAuthor, onClose, onAdd }: {
  slug: string;
  defaultAuthor?: string;
  onClose: () => void;
  onAdd: (photo: Photo) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [author, setAuthor] = useState(defaultAuthor || "");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(next?: File) {
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      setError("Vui lòng chọn tệp ảnh.");
      return;
    }
    setError("");
    setFile(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return setError("Vui lòng chọn ảnh để chia sẻ.");
    setBusy(true);
    setError("");
    try {
      const url = await uploadImage(file);
      const photo = await api<Photo>(
        `/public/weddings/${encodeURIComponent(slug)}/photos`,
        json("POST", { url, author: author.trim() || "Ẩn danh", caption: caption.trim() }),
      );
      onAdd(photo);
      onClose();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="invite-popup-backdrop" role="dialog" aria-modal="true" aria-label="Chia sẻ khoảnh khắc">
      <motion.div className="photo-dialog" initial={reduced ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="photo-dialog-header">
          <h3>Chia sẻ khoảnh khắc</h3>
          <button onClick={onClose} aria-label="Đóng"><X size={20} /></button>
        </div>
        <form onSubmit={submit}>
          {preview && <img className="photo-preview" src={preview} alt="Ảnh đã chọn" />}
          <label>Chọn ảnh<input type="file" accept="image/*" onChange={(event) => pick(event.target.files?.[0])} /></label>
          <label>Tên của bạn<input value={author} onChange={(event) => setAuthor(event.target.value)} /></label>
          <label>Lời nhắn<textarea rows={3} value={caption} onChange={(event) => setCaption(event.target.value)} /></label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="button" disabled={!file || busy}><Upload size={16} aria-hidden />{busy ? "Đang tải ảnh..." : "Chia sẻ ngay"}</button>
        </form>
      </motion.div>
    </div>
  );
}

export function PhotoFeedPopup({ photos, onClose, onUpload }: {
  photos: Photo[];
  onClose: () => void;
  onUpload: () => void;
}) {
  const [selected, setSelected] = useState<Photo | null>(null);
  const sorted = [...photos].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  return (
    <div className="invite-popup-backdrop" role="dialog" aria-modal="true" aria-label="Ảnh khách gửi">
      <div className="photo-feed">
        <div className="photo-dialog-header">
          <h3>Khoảnh khắc chuyến đi ({photos.length})</h3>
          <div className="actions">
            <button className="button" onClick={onUpload}>Thêm ảnh</button>
            <button onClick={onClose} aria-label="Đóng"><X size={20} /></button>
          </div>
        </div>
        {sorted.length === 0 ? (
          <div className="photo-feed-empty"><Camera size={32} /><p>Chưa có ảnh nào.</p><button className="button" onClick={onUpload}>Chia sẻ ngay</button></div>
        ) : (
          <div className="photo-feed-grid">
            {sorted.map((photo) => (
              <button key={photo.id} onClick={() => setSelected(photo)}>
                <img src={photo.url} alt={photo.caption || "Ảnh khách gửi"} loading="lazy" />
                <strong>{photo.author}</strong>
                <span>{photo.caption}</span>
                <small>{timeAgo(photo.createdAt)}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div className="photo-lightbox" role="dialog" aria-label="Xem ảnh">
          <button onClick={() => setSelected(null)} aria-label="Đóng ảnh"><X size={24} /></button>
          <img src={selected.url} alt={selected.caption || "Ảnh khách gửi"} />
          <p>{selected.author}{selected.caption && ` · ${selected.caption}`}</p>
        </div>
      )}
    </div>
  );
}
