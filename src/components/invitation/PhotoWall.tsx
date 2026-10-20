import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Photo } from "../../lib/types";
import PhotoSlide from "./PhotoSlide";
import { PhotoFeedPopup, UploadPopup } from "./PhotoDialogs";

export default function PhotoWall({ slug, defaultAuthor, onPopupChange }: {
  slug: string;
  defaultAuthor?: string;
  onPopupChange?: (open: boolean) => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showFeed, setShowFeed] = useState(false);

  useEffect(() => {
    onPopupChange?.(showUpload || showFeed);
    return () => onPopupChange?.(false);
  }, [showUpload, showFeed, onPopupChange]);

  useEffect(() => {
    let active = true;
    api<Photo[]>(`/public/weddings/${encodeURIComponent(slug)}/photos`)
      .then((items) => { if (active) setPhotos(items); })
      .catch(() => {});
    return () => { active = false; };
  }, [slug]);

  return (
    <section className="invite-section white-section" id="photoWall">
      <h2>Khoảnh khắc chuyến đi</h2>
      <PhotoSlide photos={photos} onUpload={() => setShowUpload(true)} onOpenFeed={() => setShowFeed(true)} />
      {showUpload && (
        <UploadPopup
          slug={slug}
          defaultAuthor={defaultAuthor}
          onClose={() => setShowUpload(false)}
          onAdd={(photo) => setPhotos((current) => [photo, ...current])}
        />
      )}
      {showFeed && (
        <PhotoFeedPopup
          photos={photos}
          onClose={() => setShowFeed(false)}
          onUpload={() => { setShowFeed(false); setShowUpload(true); }}
        />
      )}
    </section>
  );
}
