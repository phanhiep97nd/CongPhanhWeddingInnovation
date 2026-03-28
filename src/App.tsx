/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, MapPin, Phone, Users, Music, ExternalLink,
  Info as InfoIcon, Volume2, VolumeX, Plus, Upload,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const IMAGES = {
  hero:  "/images/DSCF7860.jpg",
  story: "/images/DSCF7944.jpg",
};

const GALLERY_PHOTOS = [
  { src: "/images/AMV_3106.jpg", title: "Khoảnh khắc ngọt ngào", desc: "Buổi chiều mùa xuân" },
  { src: "/images/AMV_3344.jpg", title: "Tình yêu nở hoa",       desc: "Chi tiết ngày cưới" },
  { src: "/images/AMV_3561.jpg", title: "Ánh mắt yêu thương",    desc: "Kỷ niệm chương", full: true },
  { src: "/images/AMV_4542.jpg", title: "Đêm tiệc rực rỡ",       desc: "Lễ kỷ niệm" },
  { src: "/images/DSCF7860.jpg", title: "Hạnh phúc bên nhau",    desc: "Ngày trọng đại" },
  { src: "/images/DSCF7944.jpg", title: "Mãi mãi cùng nhau",     desc: "Love story", full: true },
];

const COUPLE = { bride: "Phương Anh", groom: "Minh Công", short: "Ph.Anh & M.Công" };
const WEDDING_DATE = "03 · 04 · 2026";

// TODO: Cập nhật link thực tế
const ZALO_GROUP_LINK = "https://zalo.me/g/xxxxxxx";
// TODO: Cập nhật YouTube video ID nhạc Thủy Hử (ví dụ: "uM5mFpEahDU")
const YOUTUBE_MUSIC_ID = "";

const API_BASE = "/api";

// ── Photo sharing ─────────────────────────────────────────────────────────────
interface Photo {
  id: string;
  url: string;
  caption: string;
  author: string;
  createdAt: number;
}

// TODO: Tạo tài khoản Cloudinary, lấy cloud name + tạo unsigned upload preset
const CLOUDINARY_CLOUD_NAME    = "dkdl60kmn";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    // Fallback khi chưa config: dùng object URL tạm (mất khi reload)
    return URL.createObjectURL(file);
  }
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: fd },
  );
  const json = await res.json();
  return json.secure_url as string;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

// ── Shared animation variants ─────────────────────────────────────────────────
const fadeUp    = { hidden: { opacity: 0, y: 60 },  visible: { opacity: 1, y: 0,  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } } };
const fadeLeft  = { hidden: { opacity: 0, x: -70 }, visible: { opacity: 1, x: 0,  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } } };
const fadeRight = { hidden: { opacity: 0, x: 70 },  visible: { opacity: 1, x: 0,  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } } };
const scaleIn   = { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } };
const stagger   = { hidden: {}, visible: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } } };

const NAV_ITEMS = [
  { id: "story",    icon: BookOpen,  label: "Câu chuyện" },
  { id: "timeline", icon: Calendar,  label: "Lịch trình" },
  { id: "gallery",  icon: ImageIcon, label: "Bộ sưu tập" },
  { id: "info",     icon: InfoIcon,  label: "Thông tin"  },
] as const;

// ── Reveal ─────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Reveal({ children, className = "", variants = stagger as any, delay = 0 }: {
  children: React.ReactNode; className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variants?: any; delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px 0px" });
  return (
    <motion.div ref={ref} variants={variants}
      initial="hidden" animate={isInView ? "visible" : "hidden"}
      transition={{ delay }} className={className}>
      {children}
    </motion.div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
interface GuestInfo {
  _id: string;
  invitationName: string;
  name: string;
  status: "pending" | "yes" | "no";
  room?: string;
}

export default function App() {
  const [showRSVP, setShowRSVP] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDressCode, setShowDressCode] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);
  const [roomsRefreshKey, setRoomsRefreshKey] = useState(0);
  const refreshRooms = () => setRoomsRefreshKey((k) => k + 1);
  const [activeSection, setActiveSection] = useState<string>("story");
  const [bgPlaying, setBgPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bgAudioRef = useRef<HTMLAudioElement>(null);

  const { scrollYProgress } = useScroll({ container: containerRef });
  const heroZoom = useTransform(scrollYProgress, [0, 0.25], [1.0, 1.5]);
  const heroY    = useTransform(scrollYProgress, [0, 0.25], ["0%", "10%"]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observers: IntersectionObserver[] = [];
    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { root, threshold: 0.35 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Parse ?id= or ?ID= from URL, fetch guest info
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") || params.get("ID");
    if (!id) {
      // No guest ID: show InvitePopup with generic greeting
      const t = setTimeout(() => setShowInvite(true), 2500);
      return () => clearTimeout(t);
    }
    setGuestId(id);
    fetch(`${API_BASE}/guests/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setGuestInfo(data);
          setShowInvite(true);
        } else {
          const t = setTimeout(() => setShowRSVP(true), 2500);
          return () => clearTimeout(t);
        }
      })
      .catch(() => {
        const t = setTimeout(() => setShowRSVP(true), 2500);
        return () => clearTimeout(t);
      });
  }, []);

  // Autoplay background music at 60% volume on load
  useEffect(() => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    audio.volume = 0.6;
    audio.play().then(() => setBgPlaying(true)).catch(() => {});
  }, []);

  // Pause bg music while any popup is open; always resume when all are closed
  useEffect(() => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    if (showRSVP || showConfirmation || showInvite || showDressCode) {
      audio.pause();
    } else {
      audio.volume = 0.6;
      audio.play().then(() => setBgPlaying(true)).catch(() => {});
    }
  }, [showRSVP, showConfirmation, showInvite, showDressCode]);

  const toggleBgMusic = () => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    if (bgPlaying) {
      audio.pause();
      setBgPlaying(false);
    } else {
      audio.play().catch(() => {});
      setBgPlaying(true);
    }
  };

  // Clicking a nav item immediately updates the indicator, then scrolls
  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const activeIdx = NAV_ITEMS.findIndex((n) => n.id === activeSection);

  return (
    <div ref={containerRef} className="scroll-container bg-petal selection:bg-primary">

      {/* ── Header ── */}
      <header className="fixed top-0 w-full z-50 bg-white/65 backdrop-blur-md border-b border-primary/20">
        <div className="flex justify-center items-center px-6 py-3.5">
          <h1
            onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            className="font-script text-[1.65rem] md:text-[1.9rem] text-secondary cursor-pointer select-none flex items-center gap-2"
            style={{ lineHeight: 1.4 }}
          >
            <span>Ph.Anh</span>
            <motion.span
              animate={{ scale: [1, 1.35, 1] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
              className="inline-block text-primary not-italic leading-none"
            >
              <Heart size={16} className="fill-primary" />
            </motion.span>
            <span>M.Công</span>
          </h1>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative h-screen overflow-hidden">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <motion.img
              src={IMAGES.hero} alt="Wedding"
              style={{ scale: heroZoom, y: heroY, objectPosition: "62% center" }}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-white/55 via-white/45 to-white/30" />
            <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-petal to-transparent" />
          </div>

          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 pt-16 pb-10 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="flex flex-col items-center gap-0.5 mb-5"
            >
              <div className="flex items-center gap-3">
                <div className="h-px w-10 bg-secondary/35" />
                <span className="font-sans uppercase text-secondary/65 font-semibold"
                  style={{ fontSize: 9, letterSpacing: "0.45em" }}>Established</span>
                <div className="h-px w-10 bg-secondary/35" />
              </div>
              <span className="font-sans uppercase text-secondary/50"
                style={{ fontSize: 9, letterSpacing: "0.4em" }}>October 2017</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="font-cormorant italic text-center leading-[1.05] mb-4"
              style={{
                fontSize: "clamp(3rem, 20vw, 5.5rem)", color: "#3a5029",
                fontWeight: 400, letterSpacing: "0.04em",
                textShadow: "0 1px 0 rgba(255,255,255,0.9), 0 4px 20px rgba(255,255,255,0.6)",
              }}
            >Eternal Us</motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.5 }}
              className="flex items-center justify-center gap-2 mb-6 whitespace-nowrap"
            >
              <div className="h-px w-10 bg-sage/60" />
              <span className="font-cormorant italic text-secondary/80"
                style={{ fontSize: "1.55rem", letterSpacing: "0.2em", textShadow: "0 1px 8px rgba(255,255,255,0.95)" }}>
                Love in
              </span>
              <span className="font-cormorant font-bold text-primary-deep"
                style={{ fontSize: "2rem", display: "inline-block", transform: "rotate(90deg)", lineHeight: 1, textShadow: "0 1px 6px rgba(255,255,255,0.85)" }}>
                8
              </span>
              <span className="font-cormorant italic text-secondary/80"
                style={{ fontSize: "1.55rem", letterSpacing: "0.2em", textShadow: "0 1px 8px rgba(255,255,255,0.95)" }}>
                dimensions
              </span>
              <div className="h-px w-10 bg-sage/60" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.68, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center gap-2 mb-5 whitespace-nowrap"
            >
              <span className="font-serif italic text-secondary font-normal"
                style={{ fontSize: "clamp(1.5rem, 4.2vw, 2.1rem)", textShadow: "0 1px 0 rgba(255,255,255,0.95), 0 3px 12px rgba(255,255,255,0.8)" }}>
                {COUPLE.bride}
              </span>
              <motion.span
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                className="inline-block text-primary not-italic leading-none mx-1"
              >
                <Heart size={16} className="fill-primary" />
              </motion.span>
              <span className="font-serif italic text-secondary font-normal"
                style={{ fontSize: "clamp(1.5rem, 4.2vw, 2.1rem)", textShadow: "0 1px 0 rgba(255,255,255,0.95), 0 3px 12px rgba(255,255,255,0.8)" }}>
                {COUPLE.groom}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.85 }}
              className="flex items-center gap-3 mb-10"
            >
              <div className="h-px w-8 bg-primary-dark/40" />
              <span className="font-cormorant italic text-secondary/70"
                style={{ fontSize: "1.5rem", letterSpacing: "0.32em", textShadow: "0 1px 8px rgba(255,255,255,0.98)" }}>
                {WEDDING_DATE}
              </span>
              <div className="h-px w-8 bg-primary-dark/40" />
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              onClick={() => scrollTo("story")}
              className="pointer-events-auto flex flex-col items-center gap-2 text-secondary/45 hover:text-secondary/70 transition-colors"
            >
              <span className="font-sans uppercase" style={{ fontSize: 9, letterSpacing: "0.35em" }}>
                Cuộn để xem tiếp
              </span>
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                <ChevronRight className="rotate-90" size={18} />
              </motion.div>
            </motion.button>
          </div>
        </section>

        {/* ── Story ── */}
        <div id="story" className="bg-petal">
          <StorySection onRSVP={() => setShowRSVP(true)} />
        </div>

        {/* ── Timeline ── */}
        <div id="timeline" className="bg-white">
          <TimelineSection />
        </div>

        {/* ── Gallery ── */}
        <div id="gallery" className="bg-blush">
          <GallerySection />
        </div>

        {/* ── Info ── */}
        <div id="info" className="bg-white">
          <InfoSection guestName={guestInfo?.invitationName} refreshKey={roomsRefreshKey} />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full py-16 flex flex-col items-center gap-8 text-center px-8 border-t border-sage/20 bg-white">
        <h4 className="font-script text-4xl text-secondary whitespace-nowrap flex items-center justify-center gap-3">
          <span>{COUPLE.bride}</span>
          <motion.span
            animate={{ scale: [1, 1.35, 1] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            className="inline-block text-primary not-italic leading-none"
          >
            <Heart size={24} className="fill-primary" />
          </motion.span>
          <span>{COUPLE.groom}</span>
        </h4>
        <nav className="flex flex-wrap justify-center gap-x-12 gap-y-4">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => scrollTo(item.id)}
              className="font-serif text-sm text-secondary/50 hover:text-primary-deep transition-all">
              {item.label}
            </button>
          ))}
        </nav>
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-4">
            {[Heart, Camera].map((Icon, i) => (
              <div key={i}
                className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary-deep hover:bg-primary transition-all cursor-pointer">
                <Icon size={16} />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-secondary/40 tracking-[0.3em] uppercase">
            © 2026 {COUPLE.short} — Made with love
          </p>
        </div>
      </footer>

      {/* ── RSVP Modal ── */}
      <AnimatePresence>
        {showRSVP && (
          <>
            <motion.div key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setShowRSVP(false)}
              className="fixed inset-0 z-[99] bg-black/60" />

            <motion.div key="modal"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-5 pointer-events-none"
            >
              <div className="relative w-full max-w-md max-h-[90vh] bg-white rounded-[2rem] shadow-2xl overflow-y-auto pointer-events-auto scrollbar-hide">
                <div className="sticky top-0 z-20 h-32 md:h-36 overflow-hidden">
                  <img src={IMAGES.hero} alt=""
                    className="w-full h-full object-cover object-top brightness-90" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white" />
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                    <h4 className="font-script text-2xl text-secondary drop-shadow-sm flex items-center gap-2">
                      <span>{COUPLE.bride}</span>
                      <Heart size={16} className="text-primary fill-primary" />
                      <span>{COUPLE.groom}</span>
                    </h4>
                  </div>
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-sage/40" />
                </div>
                <button onClick={() => { setShowRSVP(false); refreshRooms(); }}
                  className="fixed md:absolute top-6 right-6 md:top-3 md:right-3 z-30 p-1.5 rounded-full bg-white/90 text-secondary/60 hover:bg-white hover:text-secondary transition-all shadow-md">
                  <X size={18} />
                </button>
                <div className="px-5 pb-8 pt-2 md:px-8">
                  <RSVPForm
                    defaultName={guestInfo?.invitationName ?? ""}
                    guestId={guestId ?? undefined}
                    onComplete={() => { setShowRSVP(false); refreshRooms(); }}
                    onConfirm={(newId) => {
                      if (newId) setGuestId(newId);
                      setShowRSVP(false);
                      refreshRooms();
                      setTimeout(() => setShowConfirmation(true), 300);
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Confirmation Popup ── */}
      <AnimatePresence>
        {showConfirmation && (
          <ConfirmationPopup
            onClose={() => { setShowConfirmation(false); refreshRooms(); }}
            onScrollToInfo={() => {
              setShowConfirmation(false);
              refreshRooms();
              setTimeout(() => scrollTo("info"), 300);
            }}
            onNext={() => {
              setShowConfirmation(false);
              setTimeout(() => setShowDressCode(true), 300);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Dress Code Popup ── */}
      <AnimatePresence>
        {showDressCode && (
          <DressCodePopup onClose={() => { setShowDressCode(false); refreshRooms(); }} />
        )}
      </AnimatePresence>

      {/* ── Invite Popup ── */}
      <AnimatePresence>
        {showInvite && (
          <InvitePopup
            invitationName={guestInfo?.invitationName ?? "Bạn"}
            alreadyConfirmed={guestInfo?.status === "yes"}
            onConfirm={() => {
              setShowInvite(false);
              if (guestInfo?.status === "yes") {
                setTimeout(() => setShowConfirmation(true), 300);
              } else {
                setTimeout(() => setShowRSVP(true), 300);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Background Music ── */}
      <audio ref={bgAudioRef} src="/audio/ngaytinhvechungdoi.mp3" loop />
      <motion.button
        onClick={toggleBgMusic}
        title={bgPlaying ? "Tắt nhạc" : "Bật nhạc nền"}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        className="fixed bottom-24 right-4 z-50 w-11 h-11 rounded-full bg-white/90 backdrop-blur-md shadow-xl border border-primary/20 flex items-center justify-center text-primary-dark transition-all"
      >
        <AnimatePresence mode="wait" initial={false}>
          {bgPlaying ? (
            <motion.div key="vol2" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Volume2 size={18} />
            </motion.div>
          ) : (
            <motion.div key="volx" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <VolumeX size={18} className="text-secondary/40" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="relative flex items-center gap-1 px-5 py-3 bg-white/90 backdrop-blur-xl rounded-full shadow-2xl border border-primary/20">
          {activeIdx >= 0 && (
            <motion.div
              className="absolute -top-3.5 flex justify-center pointer-events-none"
              animate={{ left: `calc(${activeIdx} * 52px + 36px)` }}
              initial={false}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              style={{ width: 16 }}
            >
              <motion.div animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                <Heart size={14} className="text-primary-dark fill-primary-dark" />
              </motion.div>
            </motion.div>
          )}
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => scrollTo(id)} title={label}
              className="relative flex flex-col items-center justify-center w-12 h-10 rounded-full transition-colors group">
              <Icon size={20} className={`transition-all duration-300 ${activeSection === id ? "text-primary-dark scale-110" : "text-secondary/50 group-hover:text-secondary/80"}`} />
            </button>
          ))}
          <div className="w-px h-5 bg-primary/30 mx-1" />
          <button onClick={() => setShowRSVP(true)}
            className="w-10 h-10 rounded-full bg-primary-dark hover:bg-primary-deep text-white flex items-center justify-center shadow-md active:scale-90 transition-all pink-glow"
            title="Xác nhận tham dự">
            <Heart size={16} className="fill-white" />
          </button>
        </div>
      </nav>
    </div>
  );
}

// ── Invite Popup ──────────────────────────────────────────────────────────────
function InvitePopup({ invitationName, alreadyConfirmed, onConfirm }: { invitationName: string; alreadyConfirmed?: boolean; onConfirm: () => void }) {
  return (
    <>
      <motion.div
        key="invite-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[99] bg-black/60"
      />
      <motion.div
        key="invite-modal"
        initial={{ opacity: 0, scale: 0.85, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 40 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none"
      >
        <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden pointer-events-auto text-center">
          {/* Top image strip */}
          <div className="h-36 overflow-hidden relative">
            <img src="/images/DSCF7860.jpg" alt="" className="w-full h-full object-cover object-top brightness-90" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white" />
            <div className="absolute bottom-2 left-0 right-0 flex justify-center">
              <span className="font-script text-2xl text-secondary drop-shadow-sm flex items-center gap-2">
                <span>Ph.Anh</span>
                <Heart size={14} className="text-primary fill-primary" />
                <span>M.Công</span>
              </span>
            </div>
          </div>

          <div className="px-8 py-8">
            <motion.div
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              className="inline-block text-primary mb-5"
            >
              <Heart size={40} className="fill-primary" />
            </motion.div>

            <h2 className="font-serif text-xl text-secondary italic leading-snug mb-6">
              <span className="font-bold not-italic text-primary-deep">{invitationName}</span>
              <br />
              <span className="text-secondary/80">nhận được lời mời trân trọng từ</span>
              <br />
              <span className="text-sage font-medium not-italic">cô dâu Phương Anh</span>
              <span className="text-secondary/60"> và </span>
              <span className="text-sage font-medium not-italic">chú rể Minh Công</span>
            </h2>

            {alreadyConfirmed && (
              <p className="text-sm font-semibold text-sage mb-3">
                🎉 Bạn đã xác nhận tham gia, hãy nhớ lịch nhé!
              </p>
            )}

            <p className="text-xs text-secondary/50 italic mb-8">Private Wedding — 03-04 · 04 · 2026 — Aman Villa</p>

            <motion.button
              onClick={onConfirm}
              whileHover={{ y: -2, boxShadow: "0 12px 40px rgba(201,132,139,0.4)" }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 bg-primary-dark hover:bg-primary-deep text-white rounded-full font-bold tracking-widest transition-colors"
            >
              {alreadyConfirmed ? "→ Okays đã sẵn sàng" : "Xác nhận tham dự 💌"}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Story ─────────────────────────────────────────────────────────────────────
function StorySection({ onRSVP }: { onRSVP: () => void }) {
  return (
    <section className="max-w-7xl mx-auto px-6 py-28 md:py-36">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        <Reveal variants={fadeLeft} className="relative">
          <motion.div variants={fadeLeft}
            className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl ring-4 ring-primary/20">
            <img src={IMAGES.story} alt="Our Story" className="w-full h-full object-cover" />
          </motion.div>
          <motion.div variants={scaleIn}
            className="absolute bottom-4 right-4 md:-bottom-10 md:-right-8 bg-white rounded-3xl p-5 shadow-xl border border-primary/20 flex flex-col items-center gap-1">
            <Heart size={22} className="text-primary-dark fill-primary" />
            <span className="font-script text-xl text-secondary">2017 – 2026</span>
            <span className="text-[10px] uppercase tracking-widest text-sage">8 năm yêu thương</span>
          </motion.div>
        </Reveal>

        <Reveal variants={stagger} className="flex flex-col gap-7">
          <motion.span variants={fadeRight}
            className="text-sage font-bold text-xs uppercase tracking-[0.35em] flex items-center gap-2">
            <span className="w-5 h-px bg-sage/50" />Our Story<span className="w-5 h-px bg-sage/50" />
          </motion.span>
          <motion.h3 variants={fadeUp}
            className="font-serif text-5xl md:text-6xl text-secondary leading-tight italic">
            Hành trình 8 năm <br /> kết tinh thành mãi mãi
          </motion.h3>
          <motion.p variants={fadeUp} className="text-lg text-secondary/70 leading-relaxed">
            Từ những ngày đầu gặp gỡ vào năm 2017, chúng mình đã cùng nhau đi qua biết bao mùa nắng mưa.
            Mỗi khoảnh khắc sẻ chia, mỗi nụ cười và cả những thử thách đã gắn kết hai tâm hồn thành một.
          </motion.p>
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-5">
            {[{ year: "2017", label: "Nơi bắt đầu" }, { year: "2026", label: "Lễ thành hôn" }].map((item) => (
              <div key={item.year}
                className="bg-primary/10 rounded-2xl p-5 border border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-sage/30 rounded-l-2xl" />
                <h4 className="font-serif text-3xl text-secondary italic mb-1">{item.year}</h4>
                <p className="text-xs uppercase tracking-widest text-secondary/50">{item.label}</p>
              </div>
            ))}
          </motion.div>
          <motion.button variants={fadeUp} onClick={onRSVP}
            whileHover={{ y: -3, boxShadow: "0 12px 40px rgba(201,132,139,0.4)" }}
            whileTap={{ scale: 0.97 }}
            className="mt-1 self-start px-10 py-4 bg-primary-dark hover:bg-primary-deep text-white rounded-full font-bold tracking-widest text-sm shadow-lg transition-colors">
            XÁC NHẬN THAM DỰ
          </motion.button>
        </Reveal>
      </div>
    </section>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
function TimelineSection() {
  const items = [
    { time: "14:00", title: "Đón khách",          desc: "Chào đón những người thân yêu tại sảnh Glass Pavilion.", icon: <Bus size={20} /> },
    { time: "15:30", title: "Chụp hình lưu niệm", desc: "Cùng nhau lưu giữ những khoảnh khắc đẹp trước giờ làm lễ.", icon: <Camera size={20} /> },
    { time: "17:00", title: "Lễ thành hôn",        desc: "Khoảnh khắc thiêng liêng trao nhau lời thề nguyện.", icon: <Heart size={20} /> },
    { time: "18:00", title: "Tiệc tối",            desc: "Thưởng thức ẩm thực và chung vui cùng cô dâu chú rể.", icon: <Utensils size={20} /> },
  ];

  return (
    <section className="bg-white py-28 md:py-36">
      <div className="max-w-4xl mx-auto px-6">
        <Reveal variants={stagger} className="text-center mb-20">
          <motion.span variants={fadeUp}
            className="text-sage font-bold text-xs uppercase tracking-[0.35em] mb-4 block flex items-center justify-center gap-2">
            <span className="w-5 h-px bg-sage/50" />Lịch trình<span className="w-5 h-px bg-sage/50" />
          </motion.span>
          <motion.h3 variants={fadeUp} className="font-serif text-5xl text-secondary italic">Ngày chung đôi</motion.h3>
          <motion.div variants={scaleIn}
            className="mt-6 mx-auto w-16 h-0.5 bg-gradient-to-r from-transparent via-sage/50 to-transparent" />
          <motion.p variants={fadeUp} className="mt-3 font-cormorant italic text-secondary/50 text-lg">
            {WEDDING_DATE}
          </motion.p>
        </Reveal>
        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-sage/0 via-sage/30 to-sage/0 -translate-x-1/2 hidden md:block" />
          <div className="space-y-16">
            {items.map((item, i) => <TimelineItem key={i} item={item} index={i} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Gallery ───────────────────────────────────────────────────────────────────
function GallerySection() {
  const [activePhoto, setActivePhoto] = useState<number | null>(null);

  return (
    <section className="py-28 md:py-36 px-6 max-w-7xl mx-auto">
      <Reveal variants={stagger} className="text-center mb-20">
        <motion.span variants={fadeUp}
          className="text-sage font-bold text-xs uppercase tracking-[0.35em] mb-4 block flex items-center justify-center gap-2">
          <span className="w-5 h-px bg-sage/50" />Gallery<span className="w-5 h-px bg-sage/50" />
        </motion.span>
        <motion.h3 variants={fadeUp} className="font-serif text-5xl text-secondary italic">
          Khoảnh khắc hạnh phúc
        </motion.h3>
        <motion.div variants={scaleIn}
          className="mt-6 mx-auto w-20 h-0.5 bg-gradient-to-r from-transparent via-sage/40 to-transparent" />
      </Reveal>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {GALLERY_PHOTOS.map((photo, i) => (
          <GalleryCard
            key={i} photo={photo} index={i}
            isActive={activePhoto === i}
            onToggle={() => setActivePhoto(activePhoto === i ? null : i)}
          />
        ))}
      </div>
    </section>
  );
}

// ── Timeline Item ─────────────────────────────────────────────────────────────
function TimelineItem({ item, index }: {
  item: { time: string; title: string; desc: string; icon: React.ReactNode }; index: number; key?: React.Key;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const fromLeft = index % 2 !== 0;

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, x: fromLeft ? -60 : 60, y: 20 }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col md:flex-row items-center gap-8 ${index % 2 === 0 ? "md:flex-row-reverse text-center md:text-right" : "text-center md:text-left"}`}
    >
      <div className="md:w-1/2">
        <span className="font-cormorant text-3xl text-primary-dark italic mb-2 block">{item.time}</span>
        <h4 className="font-sans font-bold text-secondary mb-2">{item.title}</h4>
        <p className="text-sm text-secondary/60 leading-relaxed max-w-xs mx-auto md:mx-0">{item.desc}</p>
      </div>
      <motion.div
        whileInView={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative z-10 w-12 h-12 rounded-full bg-sage-light/20 border border-sage/40 text-sage flex items-center justify-center shadow-sm flex-shrink-0"
      >
        {item.icon}
      </motion.div>
      <div className="md:w-1/2" />
    </motion.div>
  );
}

// ── Gallery Card ──────────────────────────────────────────────────────────────
function GalleryCard({ photo, index, isActive, onToggle }: {
  photo: { src: string; title: string; desc: string; full?: boolean };
  index: number; isActive: boolean; onToggle: () => void; key?: React.Key;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const [isHovered, setIsHovered] = useState(false);
  const showOverlay = isActive || isHovered;

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.8, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative rounded-[2.5rem] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 ${photo.full ? "md:col-span-2 aspect-[16/9]" : "aspect-[4/5]"}`}
    >
      <motion.img src={photo.src} alt={photo.title}
        className="w-full h-full object-cover"
        animate={{ scale: showOverlay ? 1.1 : 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      <div
        style={{ opacity: showOverlay ? 1 : 0 }}
        className="absolute inset-0 bg-gradient-to-t from-primary-deep/80 via-primary/10 to-transparent flex flex-col justify-end p-8 md:p-10 transition-opacity duration-500"
      >
        <h4 className="font-serif text-2xl md:text-3xl italic text-white mb-1">{photo.title}</h4>
        <p className="text-sm md:text-base text-white/80">{photo.desc}</p>
      </div>
      <div
        style={{ opacity: showOverlay ? 1 : 0 }}
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary/30 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300"
      >
        <Heart size={14} className="text-white fill-white" />
      </div>
    </motion.div>
  );
}

// ── RSVP Form ─────────────────────────────────────────────────────────────────
function RSVPForm({
  defaultName = "",
  guestId,
  onComplete,
  onConfirm,
}: {
  defaultName?: string;
  guestId?: string;
  onComplete?: () => void;
  onConfirm?: (newId?: string) => void;
}) {
  const [attendance, setAttendance] = useState<"yes" | "no" | null>(null);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState(1);
  const [wantRide, setWantRide] = useState<boolean | null>(null);
  const [pickupPoint, setPickupPoint] = useState("Nhà gái 183 Vũ Tông Phan");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!attendance) errs.attendance = "Vui lòng chọn tham dự hay không.";
    if (attendance === "yes") {
      if (!name.trim()) errs.name = "Vui lòng nhập họ tên.";
      if (!phone.trim()) errs.phone = "Vui lòng nhập số điện thoại.";
      else if (!/^[0-9]{9,11}$/.test(phone.replace(/\s/g, ""))) errs.phone = "Số điện thoại không hợp lệ.";
      if (guests < 1) errs.guests = "Số khách ít nhất là 1.";
      if (wantRide === null) errs.wantRide = "Vui lòng chọn hình thức di chuyển.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!validate()) return;
    submittingRef.current = true;
    setSubmitting(true);
    let newId: string | undefined;
    try {
      if (guestId) {
        await fetch(`${API_BASE}/guests/${guestId}/rsvp`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            attendance === "yes"
              ? { status: "yes", guestCount: guests, joinGroup: wantRide ?? false, pickupPoint: wantRide ? pickupPoint : "", phone, name }
              : { status: "no",  guestCount: 0, joinGroup: false, pickupPoint: "" }
          ),
        });
      } else if (attendance === "yes") {
        const res = await fetch(`${API_BASE}/guests/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invitationName: name.trim(),
            phone,
            status: "yes",
            guestCount: guests,
            joinGroup: wantRide ?? false,
            pickupPoint: wantRide ? pickupPoint : "",
          }),
        });
        if (res.ok) { const d = await res.json(); newId = d._id; }
      }
    } catch {}
    submittingRef.current = false;
    setSubmitting(false);
    if (attendance === "yes") onConfirm?.(newId);
    else onComplete?.();
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-6 pt-2">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Heart className="text-primary-dark fill-primary" size={28} />
        </div>
        <h2 className="font-serif text-3xl text-secondary italic">Xác nhận tham dự</h2>
      </div>

      {/* Departure time */}
      <div className="bg-gradient-to-r from-primary/10 to-blush rounded-2xl p-4 mb-6 border border-primary/20">
        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2">Thời gian khởi hành</p>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-secondary font-medium">🚌 14:00 · 03/04/2026 <span className="text-secondary/50 font-normal">(Lượt đi)</span></p>
          <p className="text-sm text-secondary font-medium">🏠 11:00 · 04/04/2026 <span className="text-secondary/50 font-normal">(Lượt về)</span></p>
        </div>
      </div>

      {/* Attendance selector */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-3">Bạn có tham dự không?</p>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => { setAttendance("yes"); setErrors(e => ({...e, attendance: ""})); }}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
              attendance === "yes" ? "border-primary-dark bg-primary/15" : errors.attendance ? "border-red-300 bg-red-50" : "border-primary/20 bg-blush hover:bg-primary/10"
            }`}>
            <span className="text-3xl">🥂</span>
            <span className="font-bold text-sm text-secondary">Nhất định rồi!</span>
          </button>
          <button type="button" onClick={() => { setAttendance("no"); setErrors(e => ({...e, attendance: ""})); }}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
              attendance === "no" ? "border-secondary/40 bg-secondary/10" : errors.attendance ? "border-red-300 bg-red-50" : "border-primary/20 bg-blush hover:bg-secondary/5"
            }`}>
            <span className="text-3xl">😔</span>
            <span className="font-bold text-sm text-secondary">Sorry...</span>
          </button>
        </div>
        {errors.attendance && <p className="text-xs text-red-500 mt-2 ml-1">{errors.attendance}</p>}
      </div>

      {/* Form – only if "yes" */}
      <AnimatePresence>
        {attendance === "yes" && (
          <motion.form
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handleSubmit} className="space-y-4"
          >
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2 ml-1">Họ và tên</label>
              <input type="text" value={name} onChange={(e) => { setName(e.target.value); setErrors(er => ({...er, name: ""})); }}
                placeholder="Nhập tên của bạn"
                className={`w-full px-5 py-3.5 rounded-2xl bg-blush border focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none text-secondary ${errors.name ? "border-red-400" : "border-primary/20 focus:border-primary"}`} />
              {errors.name && <p className="text-xs text-red-500 mt-1 ml-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2 ml-1 flex items-center gap-1">
                <Phone size={10} className="inline" /> Số điện thoại
              </label>
              <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setErrors(er => ({...er, phone: ""})); }}
                placeholder="0912 345 678"
                className={`w-full px-5 py-3.5 rounded-2xl bg-blush border focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none text-secondary ${errors.phone ? "border-red-400" : "border-primary/20 focus:border-primary"}`} />
              {errors.phone && <p className="text-xs text-red-500 mt-1 ml-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2 ml-1 flex items-center gap-1">
                <Users size={10} className="inline" /> Số lượng khách
              </label>
              <div className="flex items-center gap-0 rounded-2xl bg-blush border border-primary/20 overflow-hidden">
                <button type="button"
                  onClick={() => { setGuests(g => Math.max(1, g - 1)); setErrors(er => ({...er, guests: ""})); }}
                  className="w-14 h-14 text-2xl text-secondary/60 hover:bg-primary/10 transition-colors flex-shrink-0 flex items-center justify-center">
                  −
                </button>
                <span className="flex-1 text-center font-bold text-xl text-secondary select-none">{guests}</span>
                <button type="button"
                  onClick={() => { setGuests(g => Math.min(20, g + 1)); setErrors(er => ({...er, guests: ""})); }}
                  className="w-14 h-14 text-2xl text-secondary/60 hover:bg-primary/10 transition-colors flex-shrink-0 flex items-center justify-center">
                  +
                </button>
              </div>
              {errors.guests && <p className="text-xs text-red-500 mt-1 ml-1">{errors.guests}</p>}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-3 ml-1 flex items-center gap-1">
                <Bus size={10} className="inline" /> Có đi xe cùng đoàn không?
              </p>
              <div className="flex gap-3 mb-3">
                <button type="button" onClick={() => { setWantRide(true); setErrors(er => ({...er, wantRide: ""})); }}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    wantRide === true ? "border-primary-dark bg-primary/15 text-secondary" : errors.wantRide ? "border-red-300 bg-red-50 text-secondary/60" : "border-primary/20 bg-blush text-secondary/60 hover:bg-primary/10"
                  }`}>
                  Có, đi chung 🚌
                </button>
                <button type="button" onClick={() => { setWantRide(false); setErrors(er => ({...er, wantRide: ""})); }}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    wantRide === false ? "border-secondary/30 bg-secondary/10 text-secondary" : errors.wantRide ? "border-red-300 bg-red-50 text-secondary/60" : "border-primary/20 bg-blush text-secondary/60 hover:bg-secondary/5"
                  }`}>
                  Tự đến 🚗
                </button>
              </div>
              {errors.wantRide && <p className="text-xs text-red-500 mb-2 ml-1">{errors.wantRide}</p>}

              <AnimatePresence>
                {wantRide === true && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
                  >
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2 ml-1">Điểm đón</label>
                    <select value={pickupPoint} onChange={(e) => setPickupPoint(e.target.value)}
                      className="w-full px-5 py-3.5 rounded-2xl bg-blush border border-primary/20 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none text-secondary cursor-pointer">
                      <option value="Nhà gái 183 Vũ Tông Phan">📍 Nhà gái — 183 Vũ Tông Phan</option>
                      <option value="Nhà trai ngõ 4 Cầu Bươu">📍 Nhà trai — ngõ 4 Cầu Bươu</option>
                    </select>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button type="submit" disabled={submitting}
              whileHover={{ y: -2, boxShadow: "0 12px 40px rgba(201,132,139,0.4)" }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 bg-primary-dark hover:bg-primary-deep text-white rounded-full font-bold tracking-widest transition-colors mt-2 disabled:opacity-60">
              {submitting ? "Đang gửi..." : "GỬI XÁC NHẬN 💌"}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* "No" message */}
      <AnimatePresence>
        {attendance === "no" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-4"
          >
            <p className="text-center text-sm text-secondary/60 mb-4">Tiếc quá, sẽ nhớ bạn nhiều 😢</p>
            <button onClick={() => onComplete?.()}
              className="w-full py-4 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-full font-bold tracking-widest transition-colors">
              Đã hiểu, cảm ơn bạn
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Confirmation Popup ────────────────────────────────────────────────────────
function ConfirmationPopup({ onClose, onScrollToInfo, onNext }: {
  onClose: () => void; onScrollToInfo: () => void; onNext: () => void;
}) {
  const EMOJIS = ["🍻", "🎉", "🥂", "🎊", "🎶", "💃", "🕺", "✨", "🎈", "🍾"];
  const [musicPlaying, setMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.4;
    audio.play().then(() => setMusicPlaying(true)).catch(() => {});
  }, []);

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicPlaying) { audio.pause(); setMusicPlaying(false); }
    else { audio.play().catch(() => {}); setMusicPlaying(true); }
  };

  return (
    <>
      <audio ref={audioRef} src="/audio/TuyHongNhan.mp3" loop />
      <motion.div key="conf-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-black/75"
        onClick={onClose}
      />
      <motion.div key="conf-popup"
        initial={{ opacity: 0, scale: 0.75, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.75, y: 50 }}
        transition={{ type: "spring", damping: 20, stiffness: 260 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="relative w-full max-w-sm bg-gradient-to-br from-primary/20 via-white to-blush rounded-[2.5rem] shadow-2xl overflow-hidden pointer-events-auto">

          {/* Floating emoji background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {EMOJIS.map((emoji, i) => (
              <motion.span key={i} className="absolute text-xl"
                style={{ left: `${(i * 11 + 4) % 88}%`, top: `${(i * 19 + 8) % 82}%` }}
                animate={{ y: [0, -18, 0], rotate: [0, 12, -12, 0], opacity: [0.35, 0.9, 0.35] }}
                transition={{ repeat: Infinity, duration: 2.2 + i * 0.28, delay: i * 0.22, ease: "easeInOut" }}
              >{emoji}</motion.span>
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 p-8 text-center">
            <button onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/80 text-secondary/60 hover:bg-white hover:text-secondary transition-all shadow-md">
              <X size={18} />
            </button>

            <motion.div className="text-6xl mb-3"
              animate={{ scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
              🍻
            </motion.div>

            <h2 className="font-serif text-3xl text-secondary italic mb-1">
              Hãy uống hết mình nhé!
            </h2>
            <p className="text-secondary/60 text-sm mb-1 font-semibold">
              Không say không về 🍺 Ai say mai về
            </p>
            <p className="text-secondary/40 text-xs mb-5">Cảm ơn bạn đã xác nhận tham dự 💕</p>

            {/* Music toggle */}
            <button onClick={toggleMusic}
              className={`w-full mb-4 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all ${
                musicPlaying
                  ? "bg-primary/15 border-primary/30 text-secondary"
                  : "bg-secondary/5 border-secondary/20 text-secondary/50"
              }`}
            >
              <motion.div animate={musicPlaying ? { rotate: [0, 15, -15, 0] } : {}}
                transition={{ repeat: Infinity, duration: 0.6 }}>
                <Music size={15} className={musicPlaying ? "text-primary-dark" : "text-secondary/30"} />
              </motion.div>
              <span className="text-sm italic">
                {musicPlaying ? "🎵 Nhạc Túy Hồng Nhan đang vang lên..." : "▶ Bật nhạc Túy Hồng Nhan"}
              </span>
              {musicPlaying ? <Volume2 size={13} className="text-primary-dark" /> : <VolumeX size={13} className="text-secondary/30" />}
            </button>

            {/* Info hints — display only */}
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-3 bg-white/60 rounded-2xl px-4 py-2.5 border border-black/5">
                <ExternalLink size={13} className="text-[#8DA06B] flex-shrink-0" />
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-secondary/40 leading-none mb-0.5">Nhóm Zalo</p>
                  <p className="text-xs text-secondary/60">Xem mục Info ở trang chính</p>
				  <p className="text-xs text-secondary/60">Hãy nhớ vào nhóm để cập nhật thông tin</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/60 rounded-2xl px-4 py-2.5 border border-black/5">
                <MapPin size={13} className="text-primary-dark flex-shrink-0" />
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-secondary/40 leading-none mb-0.5">Phân phòng</p>
                  <p className="text-xs text-secondary/60">Xem mục Info ở trang chính</p>
                </div>
              </div>
            </div>

            <motion.button onClick={onNext}
              whileHover={{ y: -2, boxShadow: "0 12px 32px rgba(201,132,139,0.4)" }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 bg-primary-dark hover:bg-primary-deep text-white rounded-full font-bold text-sm tracking-widest transition-colors shadow-lg">
              Nhất định rồi! →
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Dress Code Popup ──────────────────────────────────────────────────────────
function BrideFigure() {
  return (
    <svg viewBox="0 0 100 210" className="w-24 h-auto drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Veil */}
      <path d="M50 12 Q72 2 84 22 Q80 45 74 58" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
      <path d="M50 12 Q28 2 16 22 Q20 45 26 58" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
      <ellipse cx="50" cy="14" rx="10" ry="5" fill="white" opacity="0.7"/>
      {/* Hair */}
      <ellipse cx="50" cy="32" rx="19" ry="21" fill="#4a3728"/>
      {/* Face */}
      <circle cx="50" cy="34" r="16" fill="#f5c9a0"/>
      {/* Neck */}
      <path d="M44 48 L56 48 L57 60 L43 60 Z" fill="#f5c9a0"/>
      {/* Bodice */}
      <path d="M30 58 Q50 50 70 58 L73 92 Q50 98 27 92 Z" fill="#F2C8CD"/>
      {/* Waist ribbon */}
      <path d="M27 90 Q50 96 73 90" stroke="white" strokeWidth="2" opacity="0.6"/>
      {/* Skirt */}
      <path d="M27 88 Q50 96 73 88 L90 200 L10 200 Z" fill="#8DA06B"/>
      {/* Skirt overlay highlight */}
      <path d="M40 105 Q50 108 65 103 L72 155 Q50 165 30 155 Z" fill="white" opacity="0.08"/>
      {/* Left arm */}
      <path d="M30 64 Q14 80 16 100" stroke="#f5c9a0" strokeWidth="10" strokeLinecap="round"/>
      {/* Right arm */}
      <path d="M70 64 Q86 80 84 100" stroke="#f5c9a0" strokeWidth="10" strokeLinecap="round"/>
      {/* Bouquet */}
      <circle cx="14" cy="106" r="10" fill="#F2C8CD" opacity="0.9"/>
      <circle cx="23" cy="99" r="8" fill="#8DA06B" opacity="0.85"/>
      <circle cx="8"  cy="98" r="7" fill="#F2C8CD" opacity="0.7"/>
      <circle cx="18" cy="94" r="6" fill="white"   opacity="0.6"/>
      {/* Neckline detail */}
      <path d="M40 58 Q50 54 60 58" stroke="white" strokeWidth="1.5" opacity="0.5"/>
    </svg>
  );
}

function GroomFigure() {
  return (
    <svg viewBox="0 0 90 210" className="w-20 h-auto drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hair */}
      <ellipse cx="45" cy="28" rx="16" ry="18" fill="#3a2a1a"/>
      {/* Face */}
      <circle cx="45" cy="30" r="15" fill="#d4956a"/>
      {/* Neck */}
      <path d="M39 43 L51 43 L52 54 L38 54 Z" fill="#d4956a"/>
      {/* White shirt */}
      <path d="M30 52 Q45 46 60 52 L62 100 Q45 104 28 100 Z" fill="white"/>
      {/* Suit jacket left panel */}
      <path d="M14 58 L30 52 L30 118 L14 118 Z" fill="#1a1a1a"/>
      {/* Suit jacket right panel */}
      <path d="M60 52 L76 58 L76 118 L60 118 Z" fill="#1a1a1a"/>
      {/* Left lapel */}
      <path d="M30 52 L20 58 L28 76 L34 66 Z" fill="#1a1a1a"/>
      {/* Right lapel */}
      <path d="M60 52 L70 58 L62 76 L56 66 Z" fill="#1a1a1a"/>
      {/* Tie */}
      <path d="M42 52 L48 52 L50 78 L45 92 L40 78 Z" fill="#8DA06B"/>
      {/* Tie knot */}
      <path d="M42 52 Q45 56 48 52 L46 60 L44 60 Z" fill="#6d7d52"/>
      {/* Belt */}
      <rect x="14" y="116" width="62" height="7" rx="2" fill="#111"/>
      {/* Left trouser */}
      <rect x="14" y="120" width="28" height="82" rx="3" fill="#222"/>
      {/* Right trouser */}
      <rect x="48" y="120" width="28" height="82" rx="3" fill="#222"/>
      {/* Trouser crease */}
      <line x1="28" y1="125" x2="28" y2="200" stroke="#333" strokeWidth="1"/>
      <line x1="62" y1="125" x2="62" y2="200" stroke="#333" strokeWidth="1"/>
      {/* Left arm */}
      <path d="M14 62 Q2 84 6 108" stroke="#1a1a1a" strokeWidth="13" strokeLinecap="round"/>
      {/* Right arm */}
      <path d="M76 62 Q88 84 84 108" stroke="#1a1a1a" strokeWidth="13" strokeLinecap="round"/>
      {/* Shirt cuffs */}
      <circle cx="6"  cy="109" r="5.5" fill="white"/>
      <circle cx="84" cy="109" r="5.5" fill="white"/>
      {/* Pocket square */}
      <path d="M16 72 L22 70 L23 78 L17 78 Z" fill="white" opacity="0.7"/>
    </svg>
  );
}

function DressCodePopup({ onClose }: { onClose: () => void }) {
  const PALETTE = [
    { hex: '#8DA06B', label: 'Sage Green',  note: 'Xanh lá cổ điển' },
    { hex: '#F2C8CD', label: 'Blush Pink',  note: 'Hồng phấn nhẹ'   },
    { hex: '#1a1a1a', label: 'Black',       note: 'Đen thanh lịch'   },
    { hex: '#FFFFFF', label: 'White',       note: 'Trắng tinh khôi', border: true },
  ];

  return (
    <>
      <motion.div key="dc-bd"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-black/80"
        onClick={onClose}
      />
      <motion.div key="dc-popup"
        initial={{ opacity: 0, scale: 0.8, y: 60 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 60 }}
        transition={{ type: "spring", damping: 22, stiffness: 250 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="relative w-full max-w-sm pointer-events-auto overflow-hidden rounded-[2.5rem] shadow-2xl"
          style={{ background: 'linear-gradient(160deg, #f8f4ef 0%, #fdf6f0 50%, #f0f5ec 100%)' }}>

          {/* Decorative top band */}
          <div className="h-2 w-full flex">
            <div className="flex-1" style={{ background: '#8DA06B' }}/>
            <div className="flex-1" style={{ background: '#F2C8CD' }}/>
            <div className="flex-1" style={{ background: '#1a1a1a' }}/>
            <div className="flex-1" style={{ background: '#FFFFFF', borderTop: '1px solid #e5e7eb' }}/>
          </div>

          <div className="px-7 pb-8 pt-5">
            {/* Close */}
            <button onClick={onClose}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-white/80 text-secondary/50 hover:text-secondary transition-all shadow-sm">
              <X size={16} />
            </button>

            {/* Header */}
            <div className="text-center mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-secondary/40 mb-1">Wedding</p>
              <h2 className="font-serif text-4xl text-secondary italic">Dress Code</h2>
              <p className="text-secondary/50 text-xs mt-1.5">Hãy diện trang phục theo gam màu chủ đề 💕</p>
            </div>

            {/* Figures */}
            <div className="flex items-end justify-center gap-4 mb-6">
              <div className="text-center">
                <BrideFigure />
                <p className="text-[10px] font-semibold text-secondary/50 mt-1 tracking-wide uppercase">Girl</p>
              </div>
              {/* Heart between */}
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                className="mb-16 text-2xl select-none"
              >
                🤍
              </motion.div>
              <div className="text-center">
                <GroomFigure />
                <p className="text-[10px] font-semibold text-secondary/50 mt-1 tracking-wide uppercase">Boy</p>
              </div>
            </div>

            {/* Palette swatches */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {PALETTE.map((c) => (
                <div key={c.hex} className="flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 rounded-2xl shadow-md"
                    style={{ background: c.hex, border: c.border ? '1.5px solid #e5e7eb' : 'none' }} />
                  <p className="text-[9px] font-bold text-secondary/60 text-center leading-tight">{c.note}</p>
                </div>
              ))}
            </div>

            {/* Tip */}
            <div className="bg-white/70 rounded-2xl px-4 py-3 mb-5 text-center border border-black/5">
              <p className="text-xs text-secondary/60 leading-relaxed">
                Trang phục không cần quá cứng nhắc — miễn là trong gam màu chủ đề và phù hợp với không gian tiệc cưới ngoài trời ✨
              </p>
            </div>

            {/* CTA */}
            <motion.button onClick={onClose}
              whileHover={{ y: -2, boxShadow: "0 12px 32px rgba(141,160,107,0.4)" }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-full font-bold text-white text-sm tracking-widest shadow-lg transition-all"
              style={{ background: 'linear-gradient(135deg, #8DA06B 0%, #a8bc88 100%)' }}>
              Oke, let's go! 🎉
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Info Section ──────────────────────────────────────────────────────────────
interface RoomRow { invitationName: string; room?: string; }

function RoomTable({ rooms }: { rooms: RoomRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? rooms.filter((r) => r.invitationName.toLowerCase().includes(query.toLowerCase()))
    : rooms;

  return (
    <div className="bg-white rounded-3xl border border-primary/20 overflow-hidden shadow-lg">
      <div className="bg-gradient-to-r from-sage/20 to-primary/10 px-6 py-4 border-b border-primary/15">
        <h4 className="font-serif text-2xl text-secondary italic flex items-center gap-3 mb-3">
          <span>🛏️</span> Bảng phân phòng
        </h4>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm tên..."
          className="w-full px-4 py-2 rounded-xl bg-white/80 border border-primary/20 text-sm text-secondary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
        <p className="text-secondary/50 text-xs mt-2">Aman Villa · 03–04/04/2026</p>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: "320px" }}>
        <table className="w-full">
          <thead className="sticky top-0">
            <tr className="bg-blush/60 backdrop-blur-sm">
              <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-secondary/40">Tên khách</th>
              <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-secondary/40">Phòng nghỉ</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-6 text-center text-sm text-secondary/40 italic">
                  Chưa có thông tin phân phòng
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-6 text-center text-sm text-secondary/40 italic">
                  Không tìm thấy kết quả
                </td>
              </tr>
            ) : filtered.map((row, i) => (
              <tr key={i} className={`border-t border-primary/10 ${i % 2 !== 0 ? "bg-blush/20" : ""}`}>
                <td className="px-6 py-3 text-sm text-secondary/70">{row.invitationName}</td>
                <td className="px-6 py-3 font-semibold text-sm whitespace-nowrap">
                {row.room ? <span className="text-secondary">{row.room}</span> : <span className="text-secondary/30 italic">Chưa phân phòng</span>}
              </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InfoSection({ guestName, refreshKey }: { guestName?: string; refreshKey?: number }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showFeed, setShowFeed] = useState(false);
  const [rooms, setRooms] = useState<RoomRow[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/guests/rooms`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: RoomRow[]) => { if (Array.isArray(data)) setRooms(data); })
      .catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    fetch(`${API_BASE}/photos`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (Array.isArray(data)) setPhotos(data.map((p: any) => ({ id: p._id, url: p.url, caption: p.caption, author: p.author, createdAt: new Date(p.createdAt).getTime() }))); })
      .catch(() => {});
  }, []);

  const addPhoto = (p: Photo) => setPhotos((prev) => [p, ...prev]);

  return (
    <section className="py-28 md:py-36 px-6 max-w-4xl mx-auto">
      <Reveal variants={stagger} className="text-center mb-16">
        <motion.span variants={fadeUp}
          className="text-sage font-bold text-xs uppercase tracking-[0.35em] mb-4 block flex items-center justify-center gap-2">
          <span className="w-5 h-px bg-sage/50" />Thông tin<span className="w-5 h-px bg-sage/50" />
        </motion.span>
        <motion.h3 variants={fadeUp} className="font-serif text-5xl text-secondary italic">
          Chi tiết chuyến đi
        </motion.h3>
        <motion.div variants={scaleIn}
          className="mt-6 mx-auto w-20 h-0.5 bg-gradient-to-r from-transparent via-sage/40 to-transparent" />
      </Reveal>

      <div className="space-y-10">
        {/* Photo Sharing Slide */}
        <PhotoSlide
          photos={photos}
          onUpload={() => setShowUpload(true)}
          onOpenFeed={() => setShowFeed(true)}
        />

        {/* Zalo Group */}
        <Reveal variants={fadeUp}>
          <div className="bg-gradient-to-r from-primary/10 to-blush rounded-3xl p-8 border border-primary/20 text-center">
            <div className="w-14 h-14 rounded-full bg-[#8DA06B]/15 flex items-center justify-center mx-auto mb-4">
              <Users size={26} className="text-[#8DA06B]" />
            </div>
            <h4 className="font-serif text-2xl text-secondary italic mb-2">Nhóm Zalo chuyến đi</h4>
            <p className="text-secondary/60 text-sm mb-5">Tham gia nhóm để cập nhật thông tin mới nhất về lịch trình và phòng ở.</p>
            <a href={ZALO_GROUP_LINK} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#8DA06B] hover:bg-[#7a8e5c] text-primary rounded-full font-bold text-sm tracking-wider transition-colors shadow-lg">
              <ExternalLink size={15} />
              Vào nhóm Zalo ngay
            </a>
          </div>
        </Reveal>

        {/* Room Assignments */}
        <Reveal variants={fadeUp}>
          <RoomTable rooms={rooms} />
        </Reveal>

        {/* Google Maps */}
        <Reveal variants={fadeUp}>
          <div className="rounded-3xl overflow-hidden shadow-lg border border-primary/20">
            <div className="bg-gradient-to-r from-sage/20 to-primary/10 px-8 py-5 border-b border-primary/15">
              <h4 className="font-serif text-2xl text-secondary italic flex items-center gap-3">
                <MapPin size={20} className="text-sage" /> Địa điểm tổ chức
              </h4>
              <p className="text-secondary/50 text-xs mt-1">Aman Villa</p>
            </div>
            <div className="relative w-full" style={{ paddingBottom: "55%" }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4575.994936717507!2d105.4499651!3d21.078918399999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31345f5e387a80a9%3A0x1dde36d6a6dbdab3!2sAman%20Villa!5e1!3m2!1svi!2s!4v1774630261747!5m2!1svi!2s"
                className="absolute inset-0 w-full h-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Aman Villa"
              />
            </div>
          </div>
        </Reveal>

        {/* Dress Code */}
        <Reveal variants={fadeUp}>
          <div className="rounded-3xl overflow-hidden shadow-lg border border-primary/20"
            style={{ background: 'linear-gradient(160deg, #f8f4ef 0%, #fdf6f0 50%, #f0f5ec 100%)' }}>
            {/* Color band */}
            <div className="h-1.5 w-full flex">
              <div className="flex-1" style={{ background: '#8DA06B' }}/>
              <div className="flex-1" style={{ background: '#F2C8CD' }}/>
              <div className="flex-1" style={{ background: '#1a1a1a' }}/>
              <div className="flex-1" style={{ background: '#FFFFFF', borderTop: '1px solid #e5e7eb' }}/>
            </div>
            <div className="px-8 py-8">
              <div className="text-center mb-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-secondary/40 mb-1">Wedding</p>
                <h4 className="font-serif text-3xl text-secondary italic">Dress Code</h4>
                <p className="text-secondary/50 text-sm mt-1.5">Hãy diện trang phục theo gam màu chủ đề 💕</p>
              </div>

              {/* Figures */}
              <div className="flex items-end justify-center gap-6 mb-7">
                <div className="text-center">
                  <BrideFigure />
                  <p className="text-[10px] font-semibold text-secondary/40 mt-1 tracking-wide uppercase">Cô dâu</p>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                  className="mb-16 text-2xl select-none">🤍</motion.div>
                <div className="text-center">
                  <GroomFigure />
                  <p className="text-[10px] font-semibold text-secondary/40 mt-1 tracking-wide uppercase">Chú rể</p>
                </div>
              </div>

              {/* Swatches */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { hex: '#8DA06B', note: 'Xanh lá cổ điển' },
                  { hex: '#F2C8CD', note: 'Hồng phấn nhẹ'   },
                  { hex: '#1a1a1a', note: 'Đen thanh lịch'   },
                  { hex: '#FFFFFF', note: 'Trắng tinh khôi', border: true },
                ].map((c) => (
                  <div key={c.hex} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-2xl shadow-md"
                      style={{ background: c.hex, border: c.border ? '1.5px solid #e5e7eb' : 'none' }} />
                    <p className="text-[9px] font-bold text-secondary/50 text-center leading-tight">{c.note}</p>
                  </div>
                ))}
              </div>

              {/* Note */}
              <div className="bg-white/70 rounded-2xl px-4 py-3 text-center border border-black/5">
                <p className="text-xs text-secondary/60 leading-relaxed">
                  Trang phục không cần quá cứng nhắc — miễn là trong gam màu chủ đề và phù hợp với không gian tiệc cưới ngoài trời ✨
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <AnimatePresence>
        {showUpload && (
          <UploadPopup onClose={() => setShowUpload(false)} onAdd={addPhoto} defaultAuthor={guestName} />
        )}
        {showFeed && (
          <PhotoFeedPopup
            photos={photos}
            onClose={() => setShowFeed(false)}
            onUpload={() => { setShowFeed(false); setTimeout(() => setShowUpload(true), 200); }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

// ── Photo Slide ───────────────────────────────────────────────────────────────
function PhotoSlide({ photos, onUpload, onOpenFeed }: {
  photos: Photo[]; onUpload: () => void; onOpenFeed: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    if (photos.length <= 1) return;
    const t = setInterval(() => {
      setDir(1);
      setIdx((i) => (i + 1) % photos.length);
    }, 3500);
    return () => clearInterval(t);
  }, [photos.length]);

  const goTo = (next: number) => {
    setDir(next > idx ? 1 : -1);
    setIdx(next);
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <Reveal variants={fadeUp}>
      <div className="bg-gradient-to-br from-blush via-white to-primary/10 rounded-3xl p-6 border border-primary/20 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h4 className="font-serif text-xl text-secondary italic flex items-center gap-2 min-w-0 shrink">
            <Camera size={18} className="flex-shrink-0 text-sage" />
            <span className="truncate">Khoảnh khắc ...</span>
          </h4>
          <button onClick={onUpload}
            className="flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 px-4 py-2 bg-primary-dark hover:bg-primary-deep text-white rounded-full text-xs font-bold shadow-md transition-colors">
            <Plus size={13} /> Chia sẻ
          </button>
        </div>

        {photos.length === 0 ? (
          <button onClick={onUpload}
            className="w-full py-10 flex flex-col items-center gap-3 text-secondary/40 hover:text-primary-dark transition-colors rounded-2xl border-2 border-dashed border-primary/20 hover:border-primary/40">
            <span className="text-4xl">📸</span>
            <span className="text-sm">Chưa có ảnh nào · Hãy là người đầu tiên chia sẻ!</span>
          </button>
        ) : (
          <>
            {/* Auto carousel */}
            <div
              className="relative rounded-2xl overflow-hidden cursor-pointer shadow-md"
              style={{ aspectRatio: "4/3" }}
              onClick={onOpenFeed}
            >
              <AnimatePresence custom={dir} mode="popLayout" initial={false}>
                <motion.div key={photos[idx].id}
                  custom={dir} variants={variants}
                  initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  <img src={photos[idx].url} alt={photos[idx].caption}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4">
                    <p className="text-white font-semibold text-sm leading-tight">{photos[idx].author}</p>
                    {photos[idx].caption && (
                      <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{photos[idx].caption}</p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Prev / Next */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); goTo((idx - 1 + photos.length) % photos.length); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors">
                    <ChevronRight size={14} className="rotate-180" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); goTo((idx + 1) % photos.length); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </>
              )}
            </div>

            {/* Dots */}
            {photos.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {photos.map((_, i) => (
                  <button key={i} onClick={() => goTo(i)}
                    className={`rounded-full transition-all ${i === idx ? "w-4 h-1.5 bg-primary-dark" : "w-1.5 h-1.5 bg-primary/30"}`} />
                ))}
              </div>
            )}

            <button onClick={onOpenFeed}
              className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary-dark hover:underline">
              Xem tất cả {photos.length} ảnh <ChevronRight size={13} />
            </button>
          </>
        )}
      </div>
    </Reveal>
  );
}

// ── Upload Popup ──────────────────────────────────────────────────────────────
function UploadPopup({ onClose, onAdd, defaultAuthor }: { onClose: () => void; onAdd: (p: Photo) => void; defaultAuthor?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [author, setAuthor] = useState(defaultAuthor ?? "");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) pickFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      const url = await uploadToCloudinary(file);
      const body = { url, caption: caption.trim(), author: author.trim() || "Ẩn danh" };
      const res = await fetch(`${API_BASE}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const saved = res.ok ? await res.json() : null;
      onAdd({
        id: saved?._id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url,
        caption: body.caption,
        author: body.author,
        createdAt: saved ? new Date(saved.createdAt).getTime() : Date.now(),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div key="up-bd"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] bg-black/60" onClick={onClose} />
      <motion.div key="up-modal"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center pointer-events-none"
      >
        <div className="relative w-full sm:max-w-sm bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl pointer-events-auto max-h-[92vh] overflow-y-auto scrollbar-hide">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif text-xl text-secondary italic">Chia sẻ khoảnh khắc 📸</h3>
              <button onClick={onClose}
                className="p-1.5 rounded-full hover:bg-secondary/10 text-secondary/50 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div
                onClick={() => !preview && fileRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`relative rounded-2xl overflow-hidden border-2 border-dashed transition-colors ${
                  preview ? "border-primary/20" : "border-primary/30 bg-blush hover:bg-primary/10 cursor-pointer"
                }`}
              >
                {preview ? (
                  <>
                    <img src={preview} alt="preview" className="w-full object-cover max-h-52 rounded-2xl" />
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors">
                      <X size={13} />
                    </button>
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                      className="absolute bottom-2 right-2 text-[10px] bg-black/50 hover:bg-black/70 text-white rounded-full px-2.5 py-1 transition-colors">
                      Đổi ảnh
                    </button>
                  </>
                ) : (
                  <div className="py-10 flex flex-col items-center gap-2 text-secondary/35">
                    <Camera size={32} />
                    <span className="text-sm">Chọn ảnh hoặc kéo thả vào đây</span>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-1.5 ml-1">Tên của bạn</label>
                <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Nhập tên..."
                  className="w-full px-4 py-3 rounded-xl bg-blush border border-primary/20 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm transition-all" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-1.5 ml-1">Nội dung</label>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                  placeholder="Khoảnh khắc này thật..." rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-blush border border-primary/20 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm resize-none transition-all" />
              </div>

              <motion.button type="submit" disabled={!file || loading}
                whileHover={!file || loading ? {} : { y: -2 }}
                whileTap={!file || loading ? {} : { scale: 0.97 }}
                className="w-full py-3.5 bg-primary-dark hover:bg-primary-deep disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full font-bold text-sm tracking-wider transition-all flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang tải ảnh...
                  </>
                ) : (
                  <><Upload size={15} /> Chia sẻ ngay</>
                )}
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Photo Feed Popup ──────────────────────────────────────────────────────────
function PhotoFeedPopup({ photos, onClose, onUpload }: {
  photos: Photo[]; onClose: () => void; onUpload: () => void;
}) {
  const sorted = [...photos].sort((a, b) => b.createdAt - a.createdAt);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  return (
    <>
      <motion.div key="feed-bd"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] bg-black/80" onClick={onClose} />
      <motion.div key="feed-panel"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}
        className="fixed inset-x-0 bottom-0 top-14 z-[140] bg-white rounded-t-[2rem] shadow-2xl flex flex-col pointer-events-auto overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10 flex-shrink-0">
          <h3 className="font-serif text-lg text-secondary italic flex items-center gap-2">
            <Camera size={16} className="text-sage" />
            Khoảnh khắc chuyến đi
            <span className="font-sans not-italic text-sm text-secondary/35">({photos.length})</span>
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={onUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-dark hover:bg-primary-deep text-white rounded-full text-xs font-bold shadow transition-colors">
              <Plus size={12} /> Thêm ảnh
            </button>
            <button onClick={onClose}
              className="p-1.5 rounded-full hover:bg-secondary/10 text-secondary/50 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-secondary/35 gap-3">
              <span className="text-5xl">📸</span>
              <p className="text-sm">Chưa có ảnh nào cả!</p>
              <button onClick={onUpload}
                className="px-5 py-2 bg-primary-dark text-white rounded-full text-sm font-bold hover:bg-primary-deep transition-colors">
                Chia sẻ ngay
              </button>
            </div>
          ) : (
            <div className="columns-2 md:columns-3 gap-3">
              {sorted.map((p) => (
                <div key={p.id}
                  className="break-inside-avoid mb-3 rounded-2xl overflow-hidden shadow-md border border-primary/10 bg-white cursor-pointer"
                  onClick={() => setLightbox(p)}
                >
                  <img src={p.url} alt={p.caption} className="w-full object-cover hover:opacity-95 transition-opacity"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).closest("div")?.remove(); }} />
                  <div className="p-3">
                    <p className="font-semibold text-sm text-secondary">{p.author}</p>
                    {p.caption && (
                      <p className="text-xs text-secondary/60 mt-0.5 leading-relaxed">{p.caption}</p>
                    )}
                    <p className="text-[10px] text-secondary/30 mt-1.5">{timeAgo(p.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[160] bg-black/95"
              onClick={() => setLightbox(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="fixed inset-0 z-[161] flex flex-col items-center justify-center p-4 pointer-events-none"
            >
              <div className="relative pointer-events-auto max-w-lg w-full">
                <button onClick={() => setLightbox(null)}
                  className="absolute -top-10 right-0 p-2 text-white/70 hover:text-white transition-colors">
                  <X size={22} />
                </button>
                <img src={lightbox.url} alt={lightbox.caption}
                  className="w-full rounded-2xl shadow-2xl object-contain max-h-[75vh]" />
                {(lightbox.author || lightbox.caption) && (
                  <div className="mt-3 text-center">
                    <p className="text-white font-semibold text-sm">{lightbox.author}</p>
                    {lightbox.caption && (
                      <p className="text-white/60 text-xs mt-1">{lightbox.caption}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
