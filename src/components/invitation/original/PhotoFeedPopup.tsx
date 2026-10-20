// Ported verbatim from b47f907:src/App.tsx lines 1868-1973.
// Keep JSX structure and classNames; only swap hardcoded content for wedding data.

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, MapPin, Phone, Users, Music, ExternalLink,
  Info as InfoIcon, Volume2, VolumeX, Plus, Upload,
} from "lucide-react";
import { timeAgo, type Photo } from "./shared";

// ── Photo Feed Popup ──────────────────────────────────────────────────────────
export function PhotoFeedPopup({ photos, onClose, onUpload }: {
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

