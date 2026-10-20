// Ported verbatim from b47f907:src/App.tsx lines 1620-1731.
// Keep JSX structure and classNames; only swap hardcoded content for wedding data.

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, MapPin, Phone, Users, Music, ExternalLink,
  Info as InfoIcon, Volume2, VolumeX, Plus, Upload,
} from "lucide-react";
import { fadeUp, Reveal, type Photo } from "./shared";

// ── Photo Slide ───────────────────────────────────────────────────────────────
export function PhotoSlide({ photos, onUpload, onOpenFeed }: {
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

