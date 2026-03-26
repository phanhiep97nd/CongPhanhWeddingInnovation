/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, Mail,
} from "lucide-react";

const IMAGES = {
  hero:     "/images/DSCF7860.jpg",
  story:    "/images/DSCF7944.jpg",
  gallery1: "/images/AMV_3279.jpg",
  gallery2: "/images/DSCF7944.jpg",
  gallery3: "/images/DSCF7860.jpg",
  gallery4: "/images/AMV_3279.jpg",
};

const COUPLE = { bride: "Phương Anh", groom: "Minh Công", short: "Ph.Anh & M.Công" };
const WEDDING_DATE = "03 · 04 · 2026";

// ── Shared animation variants ───────────────────────────────────────────────
const fadeUp    = { hidden: { opacity: 0, y: 60 },  visible: { opacity: 1, y: 0,  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } } };
const fadeLeft  = { hidden: { opacity: 0, x: -70 }, visible: { opacity: 1, x: 0,  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } } };
const fadeRight = { hidden: { opacity: 0, x: 70 },  visible: { opacity: 1, x: 0,  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } } };
const scaleIn   = { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } };
const stagger   = { hidden: {}, visible: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } } };

const NAV_ITEMS = [
  { id: "story",        icon: BookOpen,   label: "Câu chuyện" },
  { id: "timeline",     icon: Calendar,   label: "Lịch trình" },
  { id: "gallery",      icon: ImageIcon,  label: "Bộ sưu tập" },
  { id: "rsvp-section", icon: Mail,       label: "Xác nhận"   },
] as const;

// ── Animated wrapper – triggers when element enters scroll container ─────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Reveal({
  children, className = "", variants = stagger as any, delay = 0,
}: {
  children: React.ReactNode; className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variants?: any; delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px 0px" });
  return (
    <motion.div ref={ref} variants={variants}
      initial="hidden" animate={isInView ? "visible" : "hidden"}
      transition={{ delay }}
      className={className}>
      {children}
    </motion.div>
  );
}

// ── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [showRSVP, setShowRSVP] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("story");
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll progress inside the container (0 = top, 1 = bottom)
  const { scrollYProgress } = useScroll({ container: containerRef });

  // Hero: bắt đầu bình thường (1.0), zoom OUT khi cuộn
  const heroZoom = useTransform(scrollYProgress, [0, 0.22], [1.0, 0.82]);
  const heroY    = useTransform(scrollYProgress, [0, 0.22], ["0%", "5%"]);

  // Active section tracking
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

  useEffect(() => {
    const t = setTimeout(() => setShowRSVP(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

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
              className="inline-block text-primary-dark not-italic text-lg leading-none"
            >♥</motion.span>
            <span>M.Công</span>
          </h1>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative h-screen overflow-hidden">

          {/* Photo layer – zoom-out khi cuộn */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <motion.img
              src={IMAGES.hero}
              alt="Wedding"
              style={{ scale: heroZoom, y: heroY, objectPosition: "62% center" }}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay: subtle so photo stays vivid but text is readable */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/55 via-white/45 to-white/30" />
            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-petal to-transparent" />
          </div>

          {/* Text layer – static z-10, entrance animations only */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 pt-16 pb-10 pointer-events-none">

            {/* ESTABLISHED */}
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

            {/* ETERNAL US */}
            <motion.h2
              initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="font-cormorant italic text-center leading-[1.05] mb-4"
              style={{
                fontSize: "clamp(3rem, 20vw, 5.5rem)",
                color: "#3a5029",
                fontWeight: 400,
                letterSpacing: "0.04em",
                textShadow: "0 1px 0 rgba(255,255,255,0.9), 0 4px 20px rgba(255,255,255,0.6)",
              }}
            >
              Eternal Us
            </motion.h2>

            {/* Love in ∞ dimensions */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.5 }}
              className="flex items-center justify-center gap-2 mb-6"
            >
              <div className="h-px w-10 bg-sage/60" />
              <span className="font-cormorant italic text-secondary/80"
                style={{ fontSize: "1.55rem", letterSpacing: "0.2em",
                  textShadow: "0 1px 8px rgba(255,255,255,0.95)" }}>
                Love in
              </span>
              {/* 8 xoay 90° = ∞ */}
              <span
                className="font-cormorant font-bold text-primary-deep"
                style={{
                  fontSize: "2rem", display: "inline-block",
                  transform: "rotate(90deg)", lineHeight: 1,
                  textShadow: "0 1px 6px rgba(255,255,255,0.85)",
                }}
              >8</span>
              <span className="font-cormorant italic text-secondary/80"
                style={{ fontSize: "1.55rem", letterSpacing: "0.2em",
                  textShadow: "0 1px 8px rgba(255,255,255,0.95)" }}>
                dimensions
              </span>
              <div className="h-px w-10 bg-sage/60" />
            </motion.div>

            {/* Couple names – 1 dòng, font serif đơn giản */}
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.68, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center gap-2 mb-5 whitespace-nowrap"
            >
              <span className="font-serif italic text-secondary font-normal"
                style={{
                  fontSize: "clamp(1.5rem, 4.2vw, 2.1rem)",
                  textShadow: "0 1px 0 rgba(255,255,255,0.95), 0 3px 12px rgba(255,255,255,0.8)",
                }}>
                {COUPLE.bride}
              </span>
              <motion.span
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                className="text-primary-dark leading-none mx-1"
                style={{ fontSize: "1.1rem" }}
              >♥</motion.span>
              <span className="font-serif italic text-secondary font-normal"
                style={{
                  fontSize: "clamp(1.5rem, 4.2vw, 2.1rem)",
                  textShadow: "0 1px 0 rgba(255,255,255,0.95), 0 3px 12px rgba(255,255,255,0.8)",
                }}>
                {COUPLE.groom}
              </span>
            </motion.div>

            {/* Date */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.85 }}
              className="flex items-center gap-3 mb-10"
            >
              <div className="h-px w-8 bg-primary-dark/40" />
              <span className="font-cormorant italic text-secondary/70"
                style={{ fontSize: "1.5rem", letterSpacing: "0.32em",
                  textShadow: "0 1px 8px rgba(255,255,255,0.98)" }}>
                {WEDDING_DATE}
              </span>
              <div className="h-px w-8 bg-primary-dark/40" />
            </motion.div>

            {/* Scroll cue */}
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              onClick={() => scrollTo("story")}
              className="pointer-events-auto flex flex-col items-center gap-2 text-secondary/45 hover:text-secondary/70 transition-colors"
            >
              <span className="font-sans uppercase"
                style={{ fontSize: 9, letterSpacing: "0.35em" }}>
                Cuộn để xem tiếp
              </span>
              <motion.div animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
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

        {/* ── RSVP ── */}
        <div id="rsvp-section"
          className="bg-gradient-to-br from-primary/30 via-blush to-primary/20 min-h-screen flex items-center py-32">
          <div className="max-w-lg mx-auto px-6 w-full">
            <RSVPForm />
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full py-16 flex flex-col items-center gap-8 text-center px-8 border-t border-sage/20 bg-white">
        <h4 className="font-script text-4xl text-secondary">
          {COUPLE.bride} <span className="text-primary-dark">♥</span> {COUPLE.groom}
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
              className="fixed inset-0 z-[100] flex items-center justify-center p-5 pointer-events-none"
            >
              <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden pointer-events-auto">
                <div className="relative h-36 overflow-hidden">
                  <img src={IMAGES.hero} alt=""
                    className="w-full h-full object-cover object-top brightness-90" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-white" />
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                    <span className="font-script text-2xl text-secondary drop-shadow-sm">
                      {COUPLE.bride} <span className="text-primary-dark">♥</span> {COUPLE.groom}
                    </span>
                  </div>
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-sage/40" />
                </div>
                <button onClick={() => setShowRSVP(false)}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 text-secondary/60 hover:bg-white hover:text-secondary transition-all shadow-sm">
                  <X size={18} />
                </button>
                <div className="px-8 pb-8 pt-2">
                  <RSVPForm onComplete={() => setShowRSVP(false)} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="relative flex items-center gap-1 px-5 py-3 bg-white/90 backdrop-blur-xl rounded-full shadow-2xl border border-primary/20">
          {activeIdx >= 0 && (
            <motion.div
              className="absolute -top-3.5 flex justify-center pointer-events-none"
              animate={{ left: `calc(${activeIdx} * 48px + 20px + 16px)` }}
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

// ── Story ────────────────────────────────────────────────────────────────────
function StorySection({ onRSVP }: { onRSVP: () => void }) {
  return (
    <section className="max-w-7xl mx-auto px-6 py-28 md:py-36">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

        {/* Image – slides from left */}
        <Reveal variants={fadeLeft} className="relative">
          <motion.div
            variants={fadeLeft}
            className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl ring-4 ring-primary/20"
          >
            <img src={IMAGES.story} alt="Our Story" className="w-full h-full object-cover" />
          </motion.div>
          <motion.div
            variants={scaleIn}
            className="absolute -bottom-10 -right-8 bg-white rounded-3xl p-5 shadow-xl border border-primary/20 hidden md:flex flex-col items-center gap-1"
          >
            <Heart size={22} className="text-primary-dark fill-primary" />
            <span className="font-script text-xl text-secondary">2017 – 2026</span>
            <span className="text-[10px] uppercase tracking-widest text-sage">8 năm yêu thương</span>
          </motion.div>
        </Reveal>

        {/* Text – slides from right */}
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

// ── Timeline ─────────────────────────────────────────────────────────────────
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
  const photos = [
    { title: "Khoảnh khắc ngọt ngào", desc: "Buổi chiều mùa xuân", img: IMAGES.gallery1 },
    { title: "Tình yêu nở hoa",       desc: "Chi tiết ngày cưới",  img: IMAGES.gallery2, full: true },
    { title: "Ánh mắt yêu thương",    desc: "Kỷ niệm chương",      img: IMAGES.gallery3 },
    { title: "Đêm tiệc rực rỡ",       desc: "Lễ kỷ niệm",          img: IMAGES.gallery4 },
  ];

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
        {photos.map((photo, i) => <GalleryCard key={i} photo={photo} index={i} />)}
      </div>
    </section>
  );
}

// ── Timeline Item ─────────────────────────────────────────────────────────────
function TimelineItem({
  item, index,
}: { item: { time: string; title: string; desc: string; icon: React.ReactNode }; index: number; key?: React.Key }) {
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
function GalleryCard({
  photo, index,
}: { photo: { title: string; desc: string; img: string; full?: boolean }; index: number; key?: React.Key }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.8, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className={`relative rounded-[2.5rem] overflow-hidden group cursor-pointer shadow-lg hover:shadow-2xl transition-shadow duration-500 ${photo.full ? "md:col-span-2 aspect-[16/9]" : "aspect-[4/5]"}`}
    >
      <motion.img src={photo.img} alt={photo.title}
        className="w-full h-full object-cover"
        whileHover={{ scale: 1.07 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-primary-deep/70 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-10">
        <h4 className="font-serif text-2xl italic text-white mb-1 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
          {photo.title}
        </h4>
        <p className="text-sm text-white/80 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75">
          {photo.desc}
        </p>
      </div>
      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Heart size={14} className="text-white fill-white" />
      </div>
    </motion.div>
  );
}

// ── RSVP Form ─────────────────────────────────────────────────────────────────
function RSVPForm({ onComplete }: { onComplete?: () => void }) {
  return (
    <Reveal variants={stagger}
      className="w-full bg-white rounded-[2.5rem] p-10 shadow-xl border border-primary/20">
      <motion.div variants={fadeUp} className="text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Heart className="text-primary-dark fill-primary" size={28} />
        </div>
        <h2 className="font-serif text-3xl text-secondary italic">Xác nhận tham dự</h2>
        <p className="text-secondary/60 mt-2 text-sm">Vui lòng phản hồi trước ngày 20/03/2026</p>
      </motion.div>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); onComplete?.(); }}>
        <motion.div variants={fadeUp}>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2 ml-1">Họ và tên</label>
          <input type="text" required placeholder="Nhập tên của bạn"
            className="w-full px-6 py-4 rounded-2xl bg-blush border border-primary/20 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-secondary" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2 ml-1">Số lượng khách</label>
          <select className="w-full px-6 py-4 rounded-2xl bg-blush border border-primary/20 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none text-secondary cursor-pointer">
            <option>1 người</option>
            <option>2 người</option>
            <option>Cả gia đình</option>
          </select>
        </motion.div>
        <motion.div variants={fadeUp}>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2 ml-1">Lời chúc</label>
          <textarea rows={3} placeholder="Gửi lời chúc đến chúng mình..."
            className="w-full px-6 py-4 rounded-2xl bg-blush border border-primary/20 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none text-secondary" />
        </motion.div>
        <motion.button variants={fadeUp} type="submit"
          whileHover={{ y: -2, boxShadow: "0 12px 40px rgba(201,132,139,0.4)" }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 bg-primary-dark hover:bg-primary-deep text-white rounded-full font-bold tracking-widest transition-colors">
          GỬI XÁC NHẬN
        </motion.button>
      </form>
    </Reveal>
  );
}
