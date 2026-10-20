// Ported verbatim from b47f907:src/App.tsx lines 567-640.
// Keep JSX structure and classNames; only swap hardcoded content for wedding data.

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, MapPin, Phone, Users, Music, ExternalLink,
  Info as InfoIcon, Volume2, VolumeX, Plus, Upload,
} from "lucide-react";
import {  } from "./shared";

// ── Invite Popup ──────────────────────────────────────────────────────────────
export function InvitePopup({ invitationName, alreadyConfirmed, onConfirm }: { invitationName: string; alreadyConfirmed?: boolean; onConfirm: () => void }) {
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

