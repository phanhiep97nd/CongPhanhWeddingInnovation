// Ported verbatim from b47f907:src/App.tsx lines 729-758, 791-833.
// Keep JSX structure and classNames; only swap hardcoded content for wedding data.

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, MapPin, Phone, Users, Music, ExternalLink,
  Info as InfoIcon, Volume2, VolumeX, Plus, Upload,
} from "lucide-react";
import { galleryPhotos, fadeUp, scaleIn, stagger, Reveal } from "./shared";

import { useWedding } from "./WeddingContext";
import Photo from "../Photo";
// ── Gallery ───────────────────────────────────────────────────────────────────
export function GallerySection() {
  const { wedding } = useWedding();
  const GALLERY_PHOTOS = galleryPhotos(wedding);
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


// ── Gallery Card ──────────────────────────────────────────────────────────────
export function GalleryCard({ photo, index, isActive, onToggle }: {
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
      <motion.div animate={{ scale: showOverlay ? 1.1 : 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="w-full h-full">
        <Photo src={photo.src} alt={photo.title} className="w-full h-full object-cover" />
      </motion.div>
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

