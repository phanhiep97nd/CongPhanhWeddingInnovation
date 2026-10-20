import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { Photo, PublicGuest, Wedding } from "../../../lib/types";
import { api } from "../../../lib/api";
import { cldUrl } from "../../../lib/images";
import { WeddingContext } from "../original/WeddingContext";
import { RSVPForm } from "../original/RSVPForm";
import GiftBoxSection from "../original/GiftBoxSection";
import { canRender3d, type Hy3dCanvasHandle } from "./Hy3dCanvas";
import { scrollToProgress } from "./progress";
import type { SceneData } from "./scene/WeddingScene";
import "./hy3d.css";

const Hy3dCanvas = lazy(() => import("./Hy3dCanvas"));

const STOP_TITLES: Record<string, string> = {
  story: "Câu chuyện của chúng mình",
  timeline: "Lịch trình ngày cưới",
  gallery: "Khoảnh khắc",
  info: "Ngày vui của chúng mình",
  rsvp: "Bạn sẽ đến chứ?",
  rooms: "Phòng nghỉ",
  photoWall: "Ảnh từ khách mời",
  dressCode: "Trang phục",
  giftBox: "Hộp mừng cưới",
};

// ── Hỷ 3D template ────────────────────────────────────────────────────────────
// A fixed 3D scene behind the page; each enabled section is a "stop": an empty band where the scene
// plays, then a paper card with the section content in the lower, thumb-friendly half of the screen.
export default function InvitationShell({ wedding, guest, slug }: { wedding: Wedding; guest: PublicGuest | null; slug: string }) {
  const stops = useMemo(() => wedding.sections.filter((section) => section.enabled).map((section) => section.key), [wedding.sections]);
  const [use3d, setUse3d] = useState(() => canRender3d());
  const canvasRef = useRef<Hy3dCanvasHandle>(null);
  const stopRefs = useRef<(HTMLElement | null)[]>([]);
  const publicBase = `/public/weddings/${encodeURIComponent(slug)}`;
  const [rooms, setRooms] = useState<{ invitationName: string; room: string }[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const sceneData = useMemo<SceneData>(() => ({
    groom: wedding.couple.groom,
    bride: wedding.couple.bride,
    guestName: guest?.invitationName || "",
    dateText: wedding.dateText,
    venueName: wedding.venue.name,
    colors: wedding.dressCode.colors,
    stations: stops,
    timeline: wedding.timeline.map((item) => ({ time: item.time, title: item.title })),
    photos: wedding.gallery.map((item) => cldUrl(item.url, 640)),
  }), [wedding, guest, stops]);

  useEffect(() => {
    if (stops.includes("rooms")) api<typeof rooms>(`${publicBase}/rooms`).then(setRooms).catch(() => setRooms([]));
    if (stops.includes("photoWall")) api<Photo[]>(`${publicBase}/photos`).then(setPhotos).catch(() => setPhotos([]));
  }, [publicBase, stops]);

  // Scroll -> walk progress, measured against each stop's position (re-measured on resize).
  useEffect(() => {
    if (!use3d) return;
    let frame = 0;
    let offsets: number[] = [];
    const measure = () => {
      offsets = stopRefs.current.filter(Boolean).map((element) => (element as HTMLElement).offsetTop);
    };
    const update = () => {
      frame = 0;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      canvasRef.current?.setProgress(scrollToProgress(window.scrollY, offsets, maxScroll));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    measure();
    update();
    const resizeObserver = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    resizeObserver.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [use3d, stops.length]);

  return (
    <WeddingContext.Provider value={{ wedding, guest, slug }}>
      <main className={`hy3d${use3d ? " has-scene" : " is-flat"}`}>
        {use3d && (
          <Suspense fallback={null}>
            <Hy3dCanvas ref={canvasRef} data={sceneData} onUnavailable={() => setUse3d(false)} />
          </Suspense>
        )}

        <header className="hy3d-opening">
          {!use3d && wedding.coverImage && <img className="hy3d-cover" src={cldUrl(wedding.coverImage, 1200)} alt="" fetchPriority="high" />}
          <div className="hy3d-opening-text">
            {!use3d && (
              <>
                <p>{guest ? `Thân mời ${guest.invitationName}` : "Trân trọng kính mời"}</p>
                <h1>
                  {wedding.couple.groom}
                  <span> & </span>
                  {wedding.couple.bride}
                </h1>
                <p>{wedding.dateText}</p>
              </>
            )}
          </div>
          {use3d && <p className="hy3d-hint">Chạm vào thiệp để mở, rồi vuốt lên để đi cùng chúng mình</p>}
        </header>

        {stops.map((key, index) => (
          <section
            key={key}
            id={key.replace(":", "-")}
            className="hy3d-stop"
            ref={(element) => {
              stopRefs.current[index] = element;
            }}
          >
            <article className="hy3d-card">
              <StopContent stopKey={key} wedding={wedding} guest={guest} rooms={rooms} photos={photos} />
            </article>
          </section>
        ))}

        <footer className="hy3d-end">
          <p className="hy3d-end-names">
            {wedding.couple.groom}
            {" & "}
            {wedding.couple.bride}
          </p>
          <p>Hẹn gặp bạn trong ngày vui của chúng mình.</p>
          {wedding.showBranding && <a href="/">Tạo bởi Hỷ Thiệp</a>}
        </footer>
      </main>
    </WeddingContext.Provider>
  );
}

// ── Stop content ──────────────────────────────────────────────────────────────
function StopContent({ stopKey, wedding, guest, rooms, photos }: {
  stopKey: string;
  wedding: Wedding;
  guest: PublicGuest | null;
  rooms: { invitationName: string; room: string }[];
  photos: Photo[];
}) {
  const title = STOP_TITLES[stopKey];

  if (stopKey === "story") {
    return (
      <>
        <h2>{wedding.story.title || title}</h2>
        <p className="hy3d-prose">{wedding.story.body}</p>
      </>
    );
  }
  if (stopKey === "timeline") {
    return (
      <>
        <h2>{title}</h2>
        <ol className="hy3d-timeline">
          {wedding.timeline.map((item) => (
            <li key={item.id}>
              <time>{item.time}</time>
              <div>
                <strong>{item.title}</strong>
                {item.desc && <p>{item.desc}</p>}
              </div>
            </li>
          ))}
        </ol>
      </>
    );
  }
  if (stopKey === "gallery") {
    return (
      <>
        <h2>{title}</h2>
        <div className="hy3d-strip">
          {wedding.gallery.map((item) => (
            <img key={item.id} src={cldUrl(item.url, 480)} alt={item.title || "Ảnh cưới"} loading="lazy" decoding="async" />
          ))}
        </div>
      </>
    );
  }
  if (stopKey === "info") {
    return (
      <>
        <h2>{title}</h2>
        <p className="hy3d-date">
          {wedding.eventTime && `${wedding.eventTime} · `}
          {wedding.dateText}
        </p>
        <p className="hy3d-venue">{wedding.venue.name}</p>
        {wedding.venue.address && <p>{wedding.venue.address}</p>}
        <div className="hy3d-actions">
          {wedding.venue.mapUrl && <a className="hy3d-button" href={wedding.venue.mapUrl} target="_blank" rel="noreferrer">Xem bản đồ</a>}
          {wedding.zaloGroupLink && <a className="hy3d-button is-quiet" href={wedding.zaloGroupLink} target="_blank" rel="noreferrer">Nhóm Zalo</a>}
        </div>
      </>
    );
  }
  if (stopKey === "rsvp") {
    return (
      <>
        <h2>{title}</h2>
        <RSVPForm defaultName={guest?.invitationName || ""} guestId={guest?.code} />
      </>
    );
  }
  if (stopKey === "rooms") {
    return (
      <>
        <h2>{title}</h2>
        {rooms.length ? (
          <ul className="hy3d-list">
            {rooms.map((room, index) => (
              <li key={index}>
                <span>{room.invitationName}</span>
                <span>{room.room || "Đang sắp xếp"}</span>
              </li>
            ))}
          </ul>
        ) : <p>Thông tin phòng sẽ được cập nhật sớm.</p>}
      </>
    );
  }
  if (stopKey === "photoWall") {
    return (
      <>
        <h2>{title}</h2>
        {photos.length ? (
          <div className="hy3d-strip">
            {photos.map((photo) => <img key={photo.id} src={cldUrl(photo.url, 480)} alt={photo.caption || `Ảnh của ${photo.author}`} loading="lazy" />)}
          </div>
        ) : <p>Hãy là người đầu tiên gửi ảnh sau ngày cưới.</p>}
      </>
    );
  }
  if (stopKey === "dressCode") {
    return (
      <>
        <h2>{title}</h2>
        {wedding.dressCode.note && <p className="hy3d-prose">{wedding.dressCode.note}</p>}
        <div className="hy3d-swatches">
          {wedding.dressCode.colors.map((color) => <span key={color} style={{ backgroundColor: color }} title={color} />)}
        </div>
      </>
    );
  }
  if (stopKey === "giftBox") {
    return <GiftBoxSection wedding={wedding} />;
  }
  const custom = wedding.customSections.find((item) => `custom:${item.id}` === stopKey);
  if (!custom) return null;
  return (
    <>
      <h2>{custom.title}</h2>
      {custom.image && <img className="hy3d-custom-image" src={cldUrl(custom.image, 720)} alt="" loading="lazy" />}
      <p className="hy3d-prose">{custom.body}</p>
    </>
  );
}
