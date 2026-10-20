// Ported verbatim from b47f907:src/App.tsx lines 694-728, 759-790.
// Keep JSX structure and classNames; only swap hardcoded content for wedding data.

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, MapPin, Phone, Users, Music, ExternalLink,
  Info as InfoIcon, Volume2, VolumeX, Plus, Upload,
} from "lucide-react";
import { WEDDING_DATE, fadeUp, scaleIn, stagger, Reveal } from "./shared";

// ── Timeline ──────────────────────────────────────────────────────────────────
export function TimelineSection() {
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


// ── Timeline Item ─────────────────────────────────────────────────────────────
export function TimelineItem({ item, index }: {
  item: { time: string; title: string; desc: string; icon: React.ReactNode }; index: number; key?: React.Key;
}) {
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

