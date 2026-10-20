import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { BookOpen, CalendarDays, Camera, Heart, Info, Music2, VolumeX } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { sectionLabel } from "../lib/sections";
import type { PublicGuest, Wedding } from "../lib/types";
import Hero from "../components/invitation/Hero";
import Story from "../components/invitation/Story";
import Timeline from "../components/invitation/Timeline";
import Gallery from "../components/invitation/Gallery";
import InfoSection from "../components/invitation/Info";
import Rsvp from "../components/invitation/Rsvp";
import PhotoWall from "../components/invitation/PhotoWall";
import Rooms from "../components/invitation/Rooms";
import DressCode from "../components/invitation/DressCode";
import Custom from "../components/invitation/Custom";
import InvitePopup from "../components/invitation/InvitePopup";
const navIcons = { story: BookOpen, timeline: CalendarDays, gallery: Camera, info: Info };

function sectionId(key: string) {
  return key.replace(":", "-");
}

export default function Invitation() {
  const { slug = "", code } = useParams();
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [guest, setGuest] = useState<PublicGuest | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [roomsRefresh, setRoomsRefresh] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showRsvp, setShowRsvp] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDressCode, setShowDressCode] = useState(false);
  const [photoPopup, setPhotoPopup] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const audio = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const confirmationAudio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setShowInvite(false);
    Promise.all([
      api<Wedding>(`/public/weddings/${encodeURIComponent(slug)}`),
      code ? api<PublicGuest>(`/public/weddings/${encodeURIComponent(slug)}/guests/${encodeURIComponent(code)}`) : Promise.resolve(null),
    ]).then(([nextWedding, nextGuest]) => {
      if (active) {
        setWedding(nextWedding);
        setGuest(nextGuest);
      }
    }).catch((cause) => {
      if (active) setError(cause instanceof ApiError && cause.status === 404 ? "Không tìm thấy thiệp cưới này." : (cause as Error).message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [slug, code]);
  useEffect(() => {
    if (!wedding) return;
    document.title = wedding.meta.title || `Thiệp cưới ${wedding.couple.groom} & ${wedding.couple.bride}`;
    let meta = document.querySelector<HTMLMetaElement>("meta[name=\"description\"]");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.append(meta);
    }
    meta.content = wedding.meta.description || `Trân trọng kính mời ${guest?.invitationName || "bạn"} đến chung vui trong ngày trọng đại của ${wedding.couple.groom} & ${wedding.couple.bride}.`;
    const timer = window.setTimeout(() => setShowInvite(true), 2500);
    return () => window.clearTimeout(timer);
  }, [wedding, guest]);
  const visible = useMemo(() => wedding?.sections.filter((section) => section.enabled) || [], [wedding]);
  const nav = useMemo(() => visible.filter(({ key }) => key in navIcons || key.startsWith("custom:")), [visible]);
  const rsvpEnabled = visible.some(({ key }) => key === "rsvp");
  const anyPopup = showInvite || showRsvp || showConfirmation || showDressCode || photoPopup;
  useEffect(() => {
    if (anyPopup && playing) {
      audio.current?.pause();
      setPlaying(false);
    }
  }, [anyPopup, playing]);
  useEffect(() => {
    if (!nav.length) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      }
    }, { rootMargin: "-20% 0px -60% 0px" });
    nav.forEach(({ key }) => {
      const element = document.getElementById(sectionId(key));
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [nav]);
  async function toggleMusic() {
    if (!audio.current) return;
    if (playing) {
      audio.current.pause();
      setPlaying(false);
    } else {
      try {
        await audio.current.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  }
  if (loading) return <p className="page-loading">Đang mở thiệp...
  </p>;
  if (error || !wedding) {
    return <main className="shell not-found">
      <h1>
        {error || "Không tìm thấy thiệp cưới này."}
      </h1>
      <a href="/">Về trang chủ
      </a>
    </main>;
  }
  function render(key: string) {
    if (!wedding) return null;
    switch (key) {
      case "story": return <Story wedding={wedding} onRsvp={rsvpEnabled ? () => setShowRsvp(true) : undefined} />;
      case "timeline": return <Timeline wedding={wedding} />;
      case "gallery": return <Gallery wedding={wedding} />;
      case "info": return <InfoSection wedding={wedding} />;
      case "rsvp": return null;
      case "photoWall": return <PhotoWall slug={slug} defaultAuthor={guest?.invitationName} onPopupChange={setPhotoPopup} />;
      case "rooms": return <Rooms slug={slug} refresh={roomsRefresh} />;
      case "dressCode": return <DressCode wedding={wedding} />;
      default: {
        const custom = wedding.customSections.find((section) => key === `custom:${section.id}`);
        return custom ? <Custom section={custom} /> : null;
      }
    }
  }
  return (
    <div ref={containerRef} className="invitation scroll-container" style={{ "--wedding-primary": wedding.theme.primary || "#c9848b" } as CSSProperties}>
      <header className="invite-header">
        <a href="#top">
          {wedding.couple.bride}
          <Heart size={15} aria-hidden />
          {wedding.couple.groom}
        </a>
      </header>
      <div id="top">
        <Hero wedding={wedding} guest={guest} firstSection={sectionId(visible[0]?.key || "info")} containerRef={containerRef} />
      </div>
      <main id="first-section">
        {visible.map(({ key }) => <div key={key}>
          {render(key)}
        </div>)}
      </main>
      <footer className="invite-footer">
        <h2>
          {wedding.couple.bride} &amp;
          {wedding.couple.groom}
        </h2>
        <p>Cảm ơn bạn đã chung vui cùng chúng mình
        </p>
      </footer>
      {wedding.musicUrl && (
        <>
          <audio ref={audio} src={wedding.musicUrl} preload="none" loop />
          <button className="music-button" onClick={() => void toggleMusic()} aria-label={playing ? "Tắt nhạc" : "Bật nhạc"}>
            {playing ? <Music2 size={19} /> : <VolumeX size={19} />}
          </button>
        </>
      )}
      <nav className="invite-nav" aria-label="Các hạng mục thiệp">
        {nav.map(({ key }) => {
          const Icon = navIcons[key as keyof typeof navIcons] || Heart;
          return (
            <a key={key} href={`#${sectionId(key)}`} title={sectionLabel(key, wedding.customSections)} aria-label={sectionLabel(key, wedding.customSections)} aria-current={activeSection === sectionId(key) ? "location" : undefined}>
              <Icon size={19} aria-hidden />
            </a>
          );
        })}
        {rsvpEnabled && <button onClick={() => setShowRsvp(true)} aria-label="Xác nhận tham dự">
          <Heart size={18} fill="currentColor" aria-hidden />
        </button>}
      </nav>
      {showInvite && <InvitePopup wedding={wedding} guest={guest} rsvpEnabled={rsvpEnabled} onClose={() => setShowInvite(false)} onRsvp={() => {
        setShowInvite(false);
        if (guest?.status === "yes") setShowConfirmation(true);
        else setShowRsvp(true);
      }} />}
      {showRsvp && (
        <div className="invite-popup-backdrop" role="dialog" aria-modal="true" aria-label="Xác nhận tham dự">
          <div className="rsvp-popup">
            <button className="popup-close" onClick={() => setShowRsvp(false)} aria-label="Đóng">×
            </button>
            <Rsvp slug={slug} guest={guest} onSaved={(savedGuest) => {
              setGuest(savedGuest);
              setRoomsRefresh((count) => count + 1);
              setShowRsvp(false);
              setShowConfirmation(true);
            }} />
          </div>
        </div>
      )}
      {showConfirmation && (
        <div className="invite-popup-backdrop" role="dialog" aria-modal="true" aria-label="Cảm ơn bạn đã xác nhận">
          <div className="confirmation-popup">
            <audio ref={confirmationAudio} src="/audio/TuyHongNhan.mp3" autoPlay preload="none" />
            <h2>Cảm ơn bạn đã xác nhận
            </h2>
            <p>Hẹn gặp bạn trong ngày vui của chúng mình.
            </p>
            <button className="button" onClick={() => {
              setShowConfirmation(false);
              setShowDressCode(true);
              confirmationAudio.current?.pause();
            }}>Xem trang phục
            </button>
            <button className="text-button" onClick={() => {
              setShowConfirmation(false);
              confirmationAudio.current?.pause();
            }}>Đóng
            </button>
          </div>
        </div>
      )}
      {showDressCode && <div className="invite-popup-backdrop" role="dialog" aria-modal="true" aria-label="Trang phục">
        <div className="rsvp-popup">
          <button className="popup-close" onClick={() => setShowDressCode(false)} aria-label="Đóng">×
          </button>
          <DressCode wedding={wedding} />
        </div>
      </div>}
    </div>
  );
}
