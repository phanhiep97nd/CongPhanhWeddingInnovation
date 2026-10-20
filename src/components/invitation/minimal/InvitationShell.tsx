import { BRAND_NAME } from "../../../lib/brand";
import WeddingPhoto from "../Photo";
import { useEffect, useState } from "react";
import type { PublicGuest, Photo, Wedding } from "../../../lib/types";
import { api, json } from "../../../lib/api";
import { WeddingContext } from "../original/WeddingContext";
import { RSVPForm } from "../original/RSVPForm";
import GiftBoxSection from "../original/GiftBoxSection";
import { uploadImage } from "../../../lib/images";
import "./minimal.css";

export default function InvitationShell({ wedding, guest, slug }: { wedding: Wedding; guest: PublicGuest | null; slug: string }) {
  const [rooms, setRooms] = useState<{ invitationName: string; room: string }[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [roomSearch, setRoomSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const enabled = wedding.sections.filter(section => section.enabled);
  const publicBase = `/public/weddings/${encodeURIComponent(slug)}`;

  useEffect(() => {
    if (enabled.some(section => section.key === "rooms")) {
      api<typeof rooms>(`${publicBase}/rooms`).then(setRooms).catch(() => setRooms([]));
    }
    if (enabled.some(section => section.key === "photoWall") && wedding.entitlements?.photoWall) {
      api<Photo[]>(`${publicBase}/photos`).then(setPhotos).catch(() => setPhotos([]));
    }
  }, [publicBase, wedding.entitlements?.photoWall]);

  async function uploadPhoto(file: File) {
    setUploading(true);
    setMessage("");
    try {
      const url = await uploadImage(file);
      await api(`${publicBase}/photos`, json("POST", { url, author: guest?.invitationName || "Khách mời", caption: "" }));
      setPhotos(await api<Photo[]>(`${publicBase}/photos`));
      setMessage("Đã gửi ảnh.");
    } catch (cause) {
      setMessage((cause as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return <WeddingContext.Provider value={{ wedding, guest, slug }}>
    <main className="minimal-invite">
      <header className="minimal-hero">
        {wedding.coverImage && <WeddingPhoto src={wedding.coverImage} alt="Ảnh cưới" hero />}
        <div>
          <p>Trân trọng kính mời</p>
          <h1>{wedding.couple.bride} <span>&</span> {wedding.couple.groom}</h1>
          <p>{wedding.dateText || (wedding.eventDate && new Date(wedding.eventDate).toLocaleDateString("vi-VN"))}</p>
        </div>
      </header>
      {enabled.map(section => {
        const key = section.key;
        if (key === "story") return <section key={key} id="story">
          <h2>{wedding.story.title || "Câu chuyện của chúng mình"}</h2>
          {wedding.story.image && <img className="minimal-story-image" src={wedding.story.image} alt="Kỷ niệm của hai bạn" loading="lazy" decoding="async" />}
          <p className="minimal-prose">{wedding.story.body}</p>
        </section>;
        if (key === "timeline") return <section key={key} id="timeline">
          <h2>Lịch trình</h2>
          <ol>{wedding.timeline.map(item => <li key={item.id}><time>{item.time}</time><div><strong>{item.title}</strong><p>{item.desc}</p></div></li>)}</ol>
        </section>;
        if (key === "gallery") return <section key={key} id="gallery">
          <h2>Khoảnh khắc</h2>
          <div className="minimal-gallery">{wedding.gallery.map(item => <figure key={item.id}><WeddingPhoto src={item.url} alt={item.title || "Ảnh cưới"} sizes="(max-width: 650px) 50vw, 450px" /><figcaption>{item.title}</figcaption></figure>)}</div>
        </section>;
        if (key === "info") return <section key={key} id="info">
          <h2>Ngày vui của chúng mình</h2>
          <p>{wedding.dateText}</p>
          <h3>{wedding.venue.name}</h3>
          <p>{wedding.venue.address}</p>
          {wedding.venue.mapUrl && <a href={wedding.venue.mapUrl} target="_blank" rel="noreferrer">Xem bản đồ ↗</a>}
        </section>;
        if (key === "rsvp") return <section key={key} id="rsvp"><h2>Xác nhận tham dự</h2><RSVPForm defaultName={guest?.invitationName || ""} guestId={guest?.code} /></section>;
        if (key === "rooms") return <section key={key} id="rooms">
          <h2>Phòng nghỉ</h2>
          <label>Tìm tên khách<input value={roomSearch} onChange={event => setRoomSearch(event.target.value)} /></label>
          <ul>{rooms.filter(room => room.invitationName.toLowerCase().includes(roomSearch.toLowerCase())).map((room, index) => <li key={index}>{room.invitationName} · {room.room}</li>)}</ul>
          {!rooms.length && <p>Chưa có thông tin phòng.</p>}
        </section>;
        if (key === "dressCode") return <section key={key} id="dressCode"><h2>Trang phục</h2><p>{wedding.dressCode.note}</p><div className="minimal-swatches">{wedding.dressCode.colors.map(color => <span key={color} style={{ backgroundColor: color }} title={color} />)}</div></section>;
        if (key === "photoWall" && wedding.entitlements?.photoWall) return <section key={key} id="photoWall">
          <h2>Ảnh từ khách mời</h2>
          <label>Gửi ảnh của bạn<input type="file" accept="image/*" disabled={uploading} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadPhoto(file); }} /></label>
          {message && <p role="status">{message}</p>}
          <div className="minimal-gallery">{photos.map(photo => <figure key={photo.id}><WeddingPhoto src={photo.url} alt={photo.caption || `Ảnh của ${photo.author}`} sizes="(max-width: 650px) 50vw, 450px" /><figcaption>{photo.author}</figcaption></figure>)}</div>
        </section>;
        if (key === "giftBox") return <GiftBoxSection key={key} wedding={wedding} />;
        const custom = wedding.customSections.find(item => `custom:${item.id}` === key);
        return custom ? <section key={key}><h2>{custom.title}</h2>{custom.image && <img className="minimal-story-image" src={custom.image} alt="" />}<p className="minimal-prose">{custom.body}</p></section> : null;
      })}
      <footer><p>{wedding.couple.bride} & {wedding.couple.groom}</p>{wedding.showBranding && <a href="/">Tạo bởi {BRAND_NAME}</a>}</footer>
      {wedding.musicUrl && <audio controls loop src={wedding.musicUrl} aria-label="Nhạc nền" />}
    </main>
  </WeddingContext.Provider>;
}
