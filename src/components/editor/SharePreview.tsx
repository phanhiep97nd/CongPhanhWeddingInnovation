import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Guest, Wedding } from "../../lib/types";

interface PreviewMeta {
  title: string;
  description: string;
  image: string;
  siteName: string;
  url: string;
}

export default function SharePreview({ wedding, guests }: { wedding: Wedding; guests?: Guest[] }) {
  const [loadedGuests, setLoadedGuests] = useState<Guest[]>([]);
  const [code, setCode] = useState("");
  const [meta, setMeta] = useState<PreviewMeta | null>(null);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    if (guests) return;
    api<Guest[]>(`/weddings/${wedding.id}/guests`, {}, true)
      .then(result => setLoadedGuests(Array.isArray(result) ? result : []))
      .catch(() => setLoadedGuests([]));
  }, [wedding.id, guests]);

  useEffect(() => {
    let active = true;
    setState("loading");
    const timer = setTimeout(() => {
      const query = code ? `?g=${encodeURIComponent(code)}` : "";
      api<PreviewMeta>(`/weddings/${wedding.id}/preview-meta${query}`, {}, true)
        .then(result => {
          if (!active) return;
          setMeta(result);
          setState("ready");
        })
        .catch(() => {
          if (active) setState("error");
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [wedding.id, wedding.meta.title, wedding.meta.description, wedding.eventDate, wedding.eventTime, wedding.dateText, wedding.coverImage, wedding.ogImage, wedding.venue.name, wedding.venue.address, code]);

  return <section className="share-preview editor-item" aria-label="Xem trước khi gửi">
    <h3>Xem trước khi gửi</h3>
    <label>
      Khách nhận thiệp
      <select value={code} onChange={event => setCode(event.target.value)}>
        <option value="">Không có khách</option>
        {(guests || loadedGuests).map(guest =>
          <option key={guest.code} value={guest.code}>
            {guest.invitationName}
          </option>
        )}
      </select>
    </label>
    <small>Bản xem trước dùng nội dung đã lưu.</small>
    {state === "loading" && <p role="status">Đang tạo bản xem trước…</p>}
    {state === "error" && <p role="alert">Không tải được bản xem trước. Hãy thử lại.</p>}
    {state === "ready" && meta &&
      <div className="chat-bubble">
        <p>Thiệp cưới của chúng mình 💌</p>
        <article className="link-preview">
          {meta.image && <img src={meta.image} alt="Ảnh xem trước thiệp" />}
          <div>
            <strong>{meta.title}</strong>
            <p>{meta.description}</p>
            <small>{new URL(meta.url, window.location.origin).hostname}</small>
          </div>
        </article>
      </div>
    }
  </section>;
}
