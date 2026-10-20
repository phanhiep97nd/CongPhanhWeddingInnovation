// Ported verbatim from b47f907:src/App.tsx lines 14-108.
// Keep JSX structure and classNames; only swap hardcoded content for wedding data.

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, MapPin, Phone, Users, Music, ExternalLink,
  Info as InfoIcon, Volume2, VolumeX, Plus, Upload,
} from "lucide-react";
import type { Wedding } from "../../../lib/types";
import { uploadImage } from "../../../lib/images";

// ── Constants ─────────────────────────────────────────────────────────────────
export function weddingImages(wedding: Wedding) {
  return { hero: wedding.coverImage, story: wedding.story.image || wedding.coverImage };
}

export function galleryPhotos(wedding: Wedding) {
  return wedding.gallery.map((photo) => ({ ...photo, src: photo.url }));
}

export function couple(wedding: Wedding) {
  return { ...wedding.couple, short: `${wedding.couple.bride} & ${wedding.couple.groom}` };
}

export function weddingDate(wedding: Wedding) {
  return wedding.dateText || (wedding.eventDate ? new Date(wedding.eventDate).toLocaleDateString("vi-VN") : "");
}

// ── Photo sharing ─────────────────────────────────────────────────────────────
export interface Photo {
  id: string;
  url: string;
  caption: string;
  author: string;
  createdAt: number;
}

export async function uploadToCloudinary(file: File): Promise<string> {
  return uploadImage(file);
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
];

// Only top-level blocks get a nav entry; rooms / photoWall / dressCode live inside "info".
export function navItems(wedding: Wedding) {
  return wedding.sections.filter((section) => section.enabled).flatMap((section) => {
    const original = NAV_ITEMS.find((item) => item.id === section.key);
    if (original) return [original];
    const custom = wedding.customSections.find((item) => `custom:${item.id}` === section.key);
    return custom ? [{ id: section.key.replace(":", "-"), icon: BookOpen, label: custom.title || "Thông tin" }] : [];
  });
}

const DEFAULT_THEME = "#b76e79";

function mixHex(hex: string, target: number, amount: number) {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return "#" + channels
    .map((value) => Math.round(value + (target - value) * amount).toString(16).padStart(2, "0"))
    .join("");
}

// The original palette has three rose tones (light background, mid accent, deep text).
// Keep them untouched for the default theme; otherwise derive all three from the chosen colour.
// Plain hex values (no color-mix) keep old iOS / Zalo WebViews working.
export function themeVariables(primary: string): Record<string, string> {
  if (!/^#[0-9a-f]{6}$/i.test(primary) || primary.toLowerCase() === DEFAULT_THEME) return {};
  return {
    "--color-primary": mixHex(primary, 255, 0.62),
    "--color-primary-dark": primary,
    "--color-primary-deep": mixHex(primary, 0, 0.18),
  };
}

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
