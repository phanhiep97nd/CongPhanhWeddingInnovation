import { useEffect, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { Photo } from "../../lib/types";

export default function PhotoSlide({ photos, onUpload, onOpenFeed }: {
  photos: Photo[];
  onUpload: () => void;
  onOpenFeed: () => void;
}) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (photos.length < 2 || reduced) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % photos.length), 3500);
    return () => window.clearInterval(timer);
  }, [photos.length, reduced]);

  const photo = photos[index % photos.length];

  return (
    <div className="photo-slide">
      <div className="photo-slide-header">
        <Camera size={20} aria-hidden />
        <h3>Khoảnh khắc của chúng mình</h3>
        <button className="button" onClick={onUpload}><Plus size={15} aria-hidden /> Chia sẻ</button>
      </div>
      {photo ? (
        <>
          <button className="photo-slide-image" onClick={onOpenFeed} aria-label="Xem tất cả ảnh khách gửi">
            <motion.img key={photo.id} src={photo.url} alt={photo.caption || "Ảnh khách gửi"} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} />
            <span><strong>{photo.author}</strong>{photo.caption && <small>{photo.caption}</small>}</span>
          </button>
          {photos.length > 1 && (
            <div className="photo-slide-controls">
              <button onClick={() => setIndex((index - 1 + photos.length) % photos.length)} aria-label="Ảnh trước"><ChevronLeft size={18} /></button>
              <span>{index + 1} / {photos.length}</span>
              <button onClick={() => setIndex((index + 1) % photos.length)} aria-label="Ảnh tiếp"><ChevronRight size={18} /></button>
            </div>
          )}
          <button className="text-button" onClick={onOpenFeed}>Xem tất cả {photos.length} ảnh</button>
        </>
      ) : (
        <button className="photo-slide-empty" onClick={onUpload}>
          <Camera size={28} aria-hidden />
          Chưa có ảnh nào. Hãy chia sẻ khoảnh khắc đầu tiên.
        </button>
      )}
    </div>
  );
}
