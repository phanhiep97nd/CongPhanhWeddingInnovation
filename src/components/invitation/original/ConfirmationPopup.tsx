// Ported verbatim from b47f907:src/App.tsx lines 1064-1184.
// Keep JSX structure and classNames; only swap hardcoded content for wedding data.

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, MapPin, Phone, Users, Music, ExternalLink,
  Info as InfoIcon, Volume2, VolumeX, Plus, Upload,
} from "lucide-react";
import {  } from "./shared";

// ── Confirmation Popup ────────────────────────────────────────────────────────
export function ConfirmationPopup({ onClose, onScrollToInfo, onNext }: {
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
      <audio ref={audioRef} src="/audio/TuyHongNhan.mp3" preload="none" loop />
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

