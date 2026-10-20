// Ported verbatim from b47f907:src/App.tsx lines 14-108.
// Keep JSX structure and classNames; only swap hardcoded content for wedding data.

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, MapPin, Phone, Users, Music, ExternalLink,
  Info as InfoIcon, Volume2, VolumeX, Plus, Upload,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
export const IMAGES = {
  hero:  "/images/DSCF7860.jpg",
  story: "/images/DSCF7944.jpg",
};

export const GALLERY_PHOTOS = [
  { src: "/images/AMV_3106.jpg", title: "Khoảnh khắc ngọt ngào", desc: "Buổi chiều mùa xuân" },
  { src: "/images/AMV_3344.jpg", title: "Tình yêu nở hoa",       desc: "Chi tiết ngày cưới" },
  { src: "/images/AMV_3561.jpg", title: "Ánh mắt yêu thương",    desc: "Kỷ niệm chương", full: true },
  { src: "/images/AMV_4542.jpg", title: "Đêm tiệc rực rỡ",       desc: "Lễ kỷ niệm" },
  { src: "/images/DSCF7860.jpg", title: "Hạnh phúc bên nhau",    desc: "Ngày trọng đại" },
  { src: "/images/DSCF7944.jpg", title: "Mãi mãi cùng nhau",     desc: "Love story", full: true },
];

export const COUPLE = { bride: "Phương Anh", groom: "Minh Công", short: "Ph.Anh & M.Công" };
export const WEDDING_DATE = "03 · 04 · 2026";

// TODO: Cập nhật link thực tế
export const ZALO_GROUP_LINK = "https://zalo.me/g/hqjq6rzs0b5ggcijwde5";
// TODO: Cập nhật YouTube video ID nhạc Thủy Hử (ví dụ: "uM5mFpEahDU")
export const YOUTUBE_MUSIC_ID = "";

export const API_BASE = "/api";

// ── Photo sharing ─────────────────────────────────────────────────────────────
export interface Photo {
  id: string;
  url: string;
  caption: string;
  author: string;
  createdAt: number;
}

// TODO: Tạo tài khoản Cloudinary, lấy cloud name + tạo unsigned upload preset
export const CLOUDINARY_CLOUD_NAME    = "dkdl60kmn";
export const CLOUDINARY_UPLOAD_PRESET = "ml_default";

export async function uploadToCloudinary(file: File): Promise<string> {
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

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

// ── Shared animation variants ─────────────────────────────────────────────────
export const fadeUp    = { hidden: { opacity: 0, y: 60 },  visible: { opacity: 1, y: 0,  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } } };
export const fadeLeft  = { hidden: { opacity: 0, x: -70 }, visible: { opacity: 1, x: 0,  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } } };
export const fadeRight = { hidden: { opacity: 0, x: 70 },  visible: { opacity: 1, x: 0,  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } } };
export const scaleIn   = { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } };
export const stagger   = { hidden: {}, visible: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } } };

export const NAV_ITEMS = [
  { id: "story",    icon: BookOpen,  label: "Câu chuyện" },
  { id: "timeline", icon: Calendar,  label: "Lịch trình" },
  { id: "gallery",  icon: ImageIcon, label: "Bộ sưu tập" },
  { id: "info",     icon: InfoIcon,  label: "Thông tin"  },
] as const;

// ── Reveal ─────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Reveal({ children, className = "", variants = stagger as any, delay = 0 }: {
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
