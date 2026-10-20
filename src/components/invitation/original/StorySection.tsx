// Ported verbatim from b47f907:src/App.tsx lines 641-693.
// Keep JSX structure and classNames; only swap hardcoded content for wedding data.

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, MapPin, Phone, Users, Music, ExternalLink,
  Info as InfoIcon, Volume2, VolumeX, Plus, Upload,
} from "lucide-react";
import { IMAGES, fadeUp, fadeLeft, fadeRight, scaleIn, stagger, Reveal } from "./shared";

// ── Story ─────────────────────────────────────────────────────────────────────
export function StorySection({ onRSVP }: { onRSVP: () => void }) {
  return (
    <section className="max-w-7xl mx-auto px-6 py-28 md:py-36">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        <Reveal variants={fadeLeft} className="relative">
          <motion.div variants={fadeLeft}
            className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl ring-4 ring-primary/20">
            <img src={IMAGES.story} alt="Our Story" className="w-full h-full object-cover" />
          </motion.div>
          <motion.div variants={scaleIn}
            className="absolute bottom-4 right-4 md:-bottom-10 md:-right-8 bg-white rounded-3xl p-5 shadow-xl border border-primary/20 flex flex-col items-center gap-1">
            <Heart size={22} className="text-primary-dark fill-primary" />
            <span className="font-script text-xl text-secondary">2017 – 2026</span>
            <span className="text-[10px] uppercase tracking-widest text-sage">8 năm yêu thương</span>
          </motion.div>
        </Reveal>

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

