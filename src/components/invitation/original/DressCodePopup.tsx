// Ported verbatim from b47f907:src/App.tsx lines 1185-1380.
// Keep JSX structure and classNames; only swap hardcoded content for wedding data.

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, MapPin, Phone, Users, Music, ExternalLink,
  Info as InfoIcon, Volume2, VolumeX, Plus, Upload,
} from "lucide-react";
import { useWedding } from "./WeddingContext";

// ── Dress Code Popup ──────────────────────────────────────────────────────────
export function BrideFigure() {
  const { wedding } = useWedding();
  return (
    <svg viewBox="0 0 100 212" className="w-24 h-auto drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      {/* Bodice — Hồng */}
      <path d="M30 58 Q50 50 70 58 L73 92 Q50 98 27 92 Z" fill={wedding.dressCode.colors[0] || "#F2C8CD"}/>
      {/* Waist ribbon — Be */}
      <path d="M27 90 Q50 97 73 90" stroke={wedding.dressCode.colors[2] || "#D4C5A9"} strokeWidth="4" strokeLinecap="round" opacity="0.95"/>
      {/* Skirt — Xanh lá */}
      <path d="M27 88 Q50 96 73 88 L90 198 L10 198 Z" fill={wedding.dressCode.colors[1] || "#8DA06B"}/>
      {/* Skirt overlay highlight */}
      <path d="M40 105 Q50 108 65 103 L72 155 Q50 165 30 155 Z" fill="white" opacity="0.08"/>
      {/* Left arm */}
      <path d="M30 64 Q14 80 16 100" stroke="#f5c9a0" strokeWidth="10" strokeLinecap="round"/>
      {/* Right arm */}
      <path d="M70 64 Q86 80 84 100" stroke="#f5c9a0" strokeWidth="10" strokeLinecap="round"/>
      {/* Bouquet */}
      <circle cx="14" cy="106" r="10" fill={wedding.dressCode.colors[0] || "#F2C8CD"} opacity="0.9"/>
      <circle cx="23" cy="99" r="8" fill={wedding.dressCode.colors[1] || "#8DA06B"} opacity="0.85"/>
      <circle cx="8"  cy="98" r="7" fill={wedding.dressCode.colors[0] || "#F2C8CD"} opacity="0.7"/>
      <circle cx="18" cy="94" r="6" fill="white"   opacity="0.6"/>
      {/* Neckline detail */}
      <path d="M40 58 Q50 54 60 58" stroke="white" strokeWidth="1.5" opacity="0.5"/>
      {/* Shoes — Đen */}
      <ellipse cx="29" cy="201" rx="13" ry="5" fill="#1a1a1a"/>
      <ellipse cx="71" cy="201" rx="13" ry="5" fill="#1a1a1a"/>
    </svg>
  );
}

export function GroomFigure() {
  const { wedding } = useWedding();
  return (
    <svg viewBox="0 0 90 210" className="w-20 h-auto drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hair */}
      <ellipse cx="45" cy="28" rx="16" ry="18" fill="#3a2a1a"/>
      {/* Face */}
      <circle cx="45" cy="30" r="15" fill="#d4956a"/>
      {/* Neck */}
      <path d="M39 43 L51 43 L52 54 L38 54 Z" fill="#d4956a"/>
      {/* Shirt — Be */}
      <path d="M30 52 Q45 46 60 52 L62 100 Q45 104 28 100 Z" fill={wedding.dressCode.colors[2] || "#D4C5A9"}/>
      {/* Suit jacket left panel — Đen */}
      <path d="M14 58 L30 52 L30 118 L14 118 Z" fill="#1a1a1a"/>
      {/* Suit jacket right panel — Đen */}
      <path d="M60 52 L76 58 L76 118 L60 118 Z" fill="#1a1a1a"/>
      {/* Left lapel — Đen */}
      <path d="M30 52 L20 58 L28 76 L34 66 Z" fill="#1a1a1a"/>
      {/* Right lapel — Đen */}
      <path d="M60 52 L70 58 L62 76 L56 66 Z" fill="#1a1a1a"/>
      {/* Tie — Xanh lá */}
      <path d="M42 52 L48 52 L50 78 L45 92 L40 78 Z" fill={wedding.dressCode.colors[1] || "#8DA06B"}/>
      {/* Tie knot */}
      <path d="M42 52 Q45 56 48 52 L46 60 L44 60 Z" fill="#6d7d52"/>
      {/* Belt — Đen */}
      <rect x="14" y="116" width="62" height="7" rx="2" fill="#111"/>
      {/* Left trouser — Đen */}
      <rect x="14" y="120" width="28" height="82" rx="3" fill="#222"/>
      {/* Right trouser — Đen */}
      <rect x="48" y="120" width="28" height="82" rx="3" fill="#222"/>
      {/* Trouser crease */}
      <line x1="28" y1="125" x2="28" y2="200" stroke="#333" strokeWidth="1"/>
      <line x1="62" y1="125" x2="62" y2="200" stroke="#333" strokeWidth="1"/>
      {/* Left arm — Đen */}
      <path d="M14 62 Q2 84 6 108" stroke="#1a1a1a" strokeWidth="13" strokeLinecap="round"/>
      {/* Right arm — Đen */}
      <path d="M76 62 Q88 84 84 108" stroke="#1a1a1a" strokeWidth="13" strokeLinecap="round"/>
      {/* Shirt cuffs — Be */}
      <circle cx="6"  cy="109" r="5.5" fill={wedding.dressCode.colors[2] || "#D4C5A9"}/>
      <circle cx="84" cy="109" r="5.5" fill={wedding.dressCode.colors[2] || "#D4C5A9"}/>
      {/* Pocket square — Be */}
      <path d="M16 72 L22 70 L23 78 L17 78 Z" fill={wedding.dressCode.colors[2] || "#D4C5A9"} opacity="0.9"/>
    </svg>
  );
}

export function DressCodePopup({ onClose }: { onClose: () => void }) {
  const { wedding } = useWedding();
  const palette = wedding.dressCode.colors.map((hex) => ({ hex, note: hex }));
  const FEMALE_PALETTE = palette;
  const MALE_PALETTE = palette;

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
            <div className="flex-1" style={{ background: wedding.dressCode.colors[0] }}/>
            <div className="flex-1" style={{ background: wedding.dressCode.colors[1] }}/>
            <div className="flex-1" style={{ background: wedding.dressCode.colors[2] }}/>
            <div className="flex-1" style={{ background: wedding.dressCode.colors[3] }}/>
          </div>

          <div className="px-7 pb-8 pt-5">
            {/* Close */}
            <button onClick={onClose} aria-label="Đóng"
              className="absolute top-5 right-5 w-11 h-11 flex items-center justify-center rounded-full bg-white/80 text-secondary/50 hover:text-secondary transition-all shadow-sm">
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
            <div className="flex flex-col gap-3 mb-6">
              {[{ label: 'Nữ', palette: FEMALE_PALETTE }, { label: 'Nam', palette: MALE_PALETTE }].map(({ label, palette }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-[9px] font-bold text-secondary/50 uppercase tracking-widest w-7 text-right shrink-0">{label}</span>
                  <div className="flex gap-2">
                    {palette.map((c) => (
                      <div key={c.note} className="flex flex-col items-center gap-1">
                        <div className="w-11 h-11 rounded-xl shadow-md" style={{ background: c.hex, border: c.hex === '#D4C5A9' ? '1px solid #c8b99a' : 'none' }} />
                        <p className="text-[8px] font-bold text-secondary/60 text-center leading-tight">{c.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Tip */}
            <div className="bg-white/70 rounded-2xl px-4 py-3 mb-5 text-center border border-black/5">
              <p className="text-xs text-secondary/60 leading-relaxed">
                {wedding.dressCode.note}
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

