import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Photo } from "../../lib/types";
import { cldUrl } from "../../lib/images";
import { useConfirmSheet } from "../ConfirmSheet";

export default function PhotosTab({ weddingId, slug }: { weddingId: string; slug: string; }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState("");
  const { confirm, sheet } = useConfirmSheet();
  useEffect(() => {
    api<Photo[]>(`/weddings/${weddingId}/photos`, {}, true).then(setPhotos).catch(e => setError(e.message));
  }, [weddingId]);
  async function remove(photo: Photo) {
    if (!await confirm("Xóa ảnh này?")) return;
    try {
      await api<void>(`/weddings/${weddingId}/photos/${photo.id}`, { method: "DELETE" }, true);
      setPhotos(items => items.filter(p => p.id !== photo.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return <div className="editor-stack">
    {sheet}
    <h3>Ảnh khách gửi
    </h3>
    {error && <p role="alert" className="error">
      {error}
    </p>}
    <div className="photo-wall">
      {photos.length === 0 && !error && <p>Chưa có ảnh khách gửi. Khi khách chia sẻ ảnh trên thiệp, ảnh sẽ xuất hiện tại đây.</p>}
      {photos.map(photo => <article className="editor-item" key={photo.id}>
        <img src={cldUrl(photo.url, 400)} alt={photo.caption} loading="lazy" decoding="async" />
        <p>
          <strong>
            {photo.author}
          </strong>
          {photo.caption}
        </p>
        <button onClick={() => void remove(photo)}>Xóa ảnh
        </button>
      </article>)}
    </div>
  </div>;
}
