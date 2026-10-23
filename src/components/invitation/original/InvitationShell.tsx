// Ported verbatim from b47f907:src/App.tsx lines 110-566.
// Keep JSX structure and classNames; only swap hardcoded content for wedding data.

import React, { useState, useEffect, useMemo, useRef } from "react";
import GiftBoxSection from "./GiftBoxSection";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, MapPin, Phone, Users, Music, ExternalLink,
  Info as InfoIcon, Volume2, VolumeX, Plus, Upload,
} from "lucide-react";
import { weddingImages, couple, weddingDate, navItems, themeVariables } from "./shared";
import { WeddingContext } from "./WeddingContext";
import Photo from "../Photo";
import { useReducedMotion } from "motion/react";
import type { PublicGuest, Wedding } from "../../../lib/types";
import type { CSSProperties, ReactNode } from "react";
import { BRAND_NAME } from "../../../lib/brand";
import { findInvitationDesign } from "../../../lib/invitationDesigns";
import { InvitePopup } from "./InvitePopup";
import { StorySection } from "./StorySection";
import { TimelineSection } from "./TimelineSection";
import { GallerySection } from "./GallerySection";
import { InfoSection } from "./InfoSection";
import { CustomSection } from "./CustomSection";
import { RSVPForm } from "./RSVPForm";
import { ConfirmationPopup } from "./ConfirmationPopup";
import { DressCodePopup } from "./DressCodePopup";

// ── App ───────────────────────────────────────────────────────────────────────
export default function InvitationShell({ wedding, guest, slug, backdrop, onScrollContainer, veiled = false }: {
  wedding: Wedding;
  guest: PublicGuest | null;
  slug: string;
  backdrop?: ReactNode;
  onScrollContainer?: (element: HTMLDivElement | null) => void;
  veiled?: boolean;   // content hidden while the backdrop plays its opening (Trong suốt mode)
}) {
  const hasBackdrop = backdrop != null;
  const design = findInvitationDesign(wedding.theme.design);
  const IMAGES = weddingImages(wedding);
  const COUPLE = couple(wedding);
  const WEDDING_DATE = weddingDate(wedding);
  // Memoised so the IntersectionObservers below are not rebuilt on every scroll-driven render.
  const NAV_ITEMS = useMemo(() => navItems(wedding), [wedding.sections, wedding.customSections]);
  const navKey = NAV_ITEMS.map(({ id }) => id).join("|");
  const reducedMotion = useReducedMotion();
  const rsvpEnabled = wedding.sections.some((section) => section.key === "rsvp" && section.enabled);
  const [showRSVP, setShowRSVP] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDressCode, setShowDressCode] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(guest?.code || null);
  const [guestInfo, setGuestInfo] = useState<PublicGuest | null>(guest);
  const [roomsRefreshKey, setRoomsRefreshKey] = useState(0);
  const refreshRooms = () => setRoomsRefreshKey((k) => k + 1);
  const [activeSection, setActiveSection] = useState<string>("story");
  const [bgPlaying, setBgPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bgAudioRef = useRef<HTMLAudioElement>(null);
  const mutedRef = useRef(false);
  const startedRef = useRef(false);
  const resumeRef = useRef(false);
  const popupOpenRef = useRef(false);
  popupOpenRef.current = showRSVP || showConfirmation || showInvite || showDressCode;

  const { scrollYProgress } = useScroll({ container: containerRef });
  const heroZoom = useTransform(scrollYProgress, [0, 0.25], [1.0, reducedMotion ? 1 : 1.5]);
  const heroY    = useTransform(scrollYProgress, [0, 0.25], ["0%", reducedMotion ? "0%" : "10%"]);

  useEffect(() => {
    onScrollContainer?.(containerRef.current);
    return () => onScrollContainer?.(null);
  }, [onScrollContainer]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navKey]);

  useEffect(() => {
    if (veiled) return;
    const timer = setTimeout(() => setShowInvite(true), guest ? 0 : 2500);
    return () => clearTimeout(timer);
  }, [guest, veiled]);

  // In-app browsers require a user gesture before audio can play.
  useEffect(() => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    audio.volume = 0.6;
    const start = (event: Event) => {
      if (startedRef.current || mutedRef.current) return;
      startedRef.current = true;
      if (event.target instanceof Element && event.target.closest(".invitation-music")) return;
      audio.play().then(() => {
        if (popupOpenRef.current) {
          audio.pause();
          resumeRef.current = true;
          setBgPlaying(false);
        } else setBgPlaying(true);
      }).catch(() => setBgPlaying(false));
    };
    document.addEventListener("pointerdown", start, { once: true });
    document.addEventListener("touchstart", start, { once: true });
    return () => {
      document.removeEventListener("pointerdown", start);
      document.removeEventListener("touchstart", start);
    };
  }, []);

  // Pause while a popup is open and resume only if music was already playing.
  useEffect(() => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    if (showRSVP || showConfirmation || showInvite || showDressCode) {
      resumeRef.current = resumeRef.current || !audio.paused;
      audio.pause();
      setBgPlaying(false);
    } else if (resumeRef.current && !mutedRef.current) {
      resumeRef.current = false;
      audio.play().then(() => setBgPlaying(true)).catch(() => setBgPlaying(false));
    }
  }, [showRSVP, showConfirmation, showInvite, showDressCode]);

  useEffect(() => {
    const open = showRSVP || showConfirmation || showInvite || showDressCode;
    if (!open) return;
    const previous = document.body.style.overflow;
    const root = containerRef.current;
    const previousRoot = root?.style.overflowY || "";
    document.body.style.overflow = "hidden";
    if (root) root.style.overflowY = "hidden";
    return () => {
      document.body.style.overflow = previous;
      if (root) root.style.overflowY = previousRoot;
    };
  }, [showRSVP, showConfirmation, showInvite, showDressCode]);

  useEffect(() => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    const visibility = () => {
      if (document.hidden) {
        resumeRef.current = resumeRef.current || !audio.paused;
        audio.pause();
        setBgPlaying(false);
      } else if (resumeRef.current && !mutedRef.current && !popupOpenRef.current) {
        resumeRef.current = false;
        audio.play().then(() => setBgPlaying(true)).catch(() => setBgPlaying(false));
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);

  const toggleBgMusic = () => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    if (bgPlaying) {
      mutedRef.current = true;
      audio.pause();
      setBgPlaying(false);
    } else {
      mutedRef.current = false;
      audio.play().then(() => setBgPlaying(true)).catch(() => setBgPlaying(false));
    }
  };

  // Clicking a nav item immediately updates the indicator, then scrolls
  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const activeIdx = NAV_ITEMS.findIndex((n) => n.id === activeSection);
  const enabled = wedding.sections.filter((section) => section.enabled);
  const firstSection = enabled.find((section) => section.key !== "rsvp")?.key.replace(":", "-") || "info";

  return (
    <WeddingContext.Provider value={{ wedding, guest, slug }}>
    <div ref={containerRef} className={`scroll-container bg-petal selection:bg-primary${design ? ` invitation-design invitation-design-${design.family}` : ""}${hasBackdrop ? " classic-over-3d" : ""}${veiled ? " is-veiled" : ""}`} style={{ ...themeVariables(wedding.theme.primary), ...(design ? { "--design-paper": design.paper, "--design-ink": design.ink } : {}) } as CSSProperties}>
      {hasBackdrop && <div className="classic-3d-backdrop" aria-hidden="true">{backdrop}</div>}

      {/* ── Header ── */}
      <header className="fixed top-0 w-full z-50 bg-white/65 backdrop-blur-md border-b border-primary/20">
        <div className="flex justify-center items-center px-6 py-3.5">
          <h1
            onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            className="font-script text-[1.65rem] md:text-[1.9rem] text-secondary cursor-pointer select-none flex items-center gap-2"
            style={{ lineHeight: 1.4 }}
          >
            <span>{COUPLE.bride}</span>
            <motion.span
              animate={{ scale: [1, 1.35, 1] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
              className="inline-block text-primary not-italic leading-none"
            >
              <Heart size={16} className="fill-primary" />
            </motion.span>
            <span>{COUPLE.groom}</span>
          </h1>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="invitation-hero relative h-screen overflow-hidden">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <motion.div style={{ scale: heroZoom, y: heroY, objectPosition: "62% center" }} className="w-full h-full">
              <Photo src={IMAGES.hero} alt="Wedding" className="w-full h-full object-cover" hero />
            </motion.div>
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
                style={{ fontSize: 9, letterSpacing: "0.4em" }}>{WEDDING_DATE}</span>
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
              onClick={() => scrollTo(firstSection)}
              className="pointer-events-auto min-h-11 min-w-11 flex flex-col items-center justify-center gap-2 text-secondary/45 hover:text-secondary/70 transition-colors"
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

        {enabled.map((section) => {
          const id = section.key.replace(":", "-");
          switch (section.key) {
            // RSVP lives in a popup; mixed mode only needs a scroll anchor for its station.
            case "rsvp": return hasBackdrop ? <div key={id} id={id} aria-hidden="true" /> : null;
            case "story": return <div key={id} id={id} className="bg-petal"><StorySection onRSVP={() => setShowRSVP(true)} /></div>;
            case "timeline": return <div key={id} id={id} className="bg-white"><TimelineSection /></div>;
            case "gallery": return <div key={id} id={id} className="bg-blush"><GallerySection /></div>;
            case "info": return <div key={id} id={id} className="bg-white"><InfoSection guestName={guestInfo?.invitationName} refreshKey={roomsRefreshKey} /></div>;
            case "rooms": return <div key={id} id={id} className="bg-white"><InfoSection mode="rooms" refreshKey={roomsRefreshKey} /></div>;
            case "photoWall": return <div key={id} id={id} className="bg-white"><InfoSection mode="photoWall" guestName={guestInfo?.invitationName} /></div>;
            case "dressCode": return <div key={id} id={id} className="bg-white"><InfoSection mode="dressCode" /></div>;
            case "giftBox": return <div key={id} id={id}><GiftBoxSection wedding={wedding} /></div>;
            default: {
              const custom = wedding.customSections.find((item) => section.key === `custom:${item.id}`);
              return custom ? <div key={id} id={id} className="bg-petal"><CustomSection section={custom} /></div> : null;
            }
          }
        })}
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
                className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary-deep">
                <Icon size={16} />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-secondary/40 tracking-[0.3em] uppercase">
            © {wedding.eventDate?.slice(0, 4) || new Date().getFullYear()} {COUPLE.short} — Made with love
          </p>
          {wedding.showBranding && <a href="/" className="font-serif text-xs text-secondary/60 underline underline-offset-4">Tạo bởi {BRAND_NAME}</a>}
        </div>
      </footer>

      {/* ── RSVP Modal ── */}
      <AnimatePresence>
        {rsvpEnabled && showRSVP && (
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
                  <Photo src={IMAGES.hero} alt=""
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
                <button onClick={() => { setShowRSVP(false); refreshRooms(); }} aria-label="Đóng xác nhận tham dự"
                  className="fixed md:absolute top-6 right-6 md:top-3 md:right-3 z-30 w-11 h-11 rounded-full bg-white/90 text-secondary/60 hover:bg-white hover:text-secondary transition-all shadow-md flex items-center justify-center">
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
        {rsvpEnabled && showConfirmation && (
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
            onClose={() => setShowInvite(false)}
            alreadyConfirmed={guestInfo?.status === "yes"}
            rsvpEnabled={rsvpEnabled}
            onConfirm={() => {
              setShowInvite(false);
              if (guestInfo?.status === "yes") {
                setTimeout(() => setShowConfirmation(true), 300);
              } else {
                if (rsvpEnabled) setTimeout(() => setShowRSVP(true), 300);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Background Music ── */}
      <audio ref={bgAudioRef} src={wedding.musicUrl || "/audio/ngaytinhvechungdoi.mp3"} preload="none" loop />
      <motion.button
        onClick={toggleBgMusic}
        title={bgPlaying ? "Tắt nhạc" : "Bật nhạc nền"}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        className="invitation-music fixed bottom-24 right-4 z-50 w-11 h-11 rounded-full bg-white/90 backdrop-blur-md shadow-xl border border-primary/20 flex items-center justify-center text-primary-dark transition-all"
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
      <nav className="invitation-bottom-nav fixed bottom-6 left-1/2 -translate-x-1/2 z-50" aria-label="Các hạng mục thiệp">
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
              className="relative flex flex-col items-center justify-center w-12 h-11 rounded-full transition-colors group">
              <Icon size={20} className={`transition-all duration-300 ${activeSection === id ? "text-primary-dark scale-110" : "text-secondary/50 group-hover:text-secondary/80"}`} />
            </button>
          ))}
          <div className="w-px h-5 bg-primary/30 mx-1" />
          {rsvpEnabled && <button onClick={() => setShowRSVP(true)}
            className="w-11 h-11 rounded-full bg-primary-dark hover:bg-primary-deep text-white flex items-center justify-center shadow-md active:scale-90 transition-all pink-glow"
            title="Xác nhận tham dự">
            <Heart size={16} className="fill-white" />
          </button>}
        </div>
      </nav>
    </div>
    </WeddingContext.Provider>
  );
}

