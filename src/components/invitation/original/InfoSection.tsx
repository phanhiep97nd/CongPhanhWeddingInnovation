// Ported verbatim from b47f907:src/App.tsx lines 1381-1619.
// Keep JSX structure and classNames; only swap hardcoded content for wedding data.

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, MapPin, Phone, Users, Music, ExternalLink,
  Info as InfoIcon, Volume2, VolumeX, Plus, Upload,
} from "lucide-react";
import { ZALO_GROUP_LINK, API_BASE, fadeUp, scaleIn, stagger, Reveal, type Photo } from "./shared";
import { BrideFigure, GroomFigure } from "./DressCodePopup";
import { PhotoSlide } from "./PhotoSlide";
import { UploadPopup } from "./UploadPopup";
import { PhotoFeedPopup } from "./PhotoFeedPopup";

// ── Info Section ──────────────────────────────────────────────────────────────
export interface RoomRow { invitationName: string; room?: string; }

export function RoomTable({ rooms }: { rooms: RoomRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? rooms.filter((r) => r.invitationName.toLowerCase().includes(query.toLowerCase()))
    : rooms;

  return (
    <div className="bg-white rounded-3xl border border-primary/20 overflow-hidden shadow-lg">
      <div className="bg-gradient-to-r from-sage/20 to-primary/10 px-6 py-4 border-b border-primary/15">
        <h4 className="font-serif text-2xl text-secondary italic flex items-center gap-3 mb-3">
          <span>🛏️</span> Bảng phân phòng
        </h4>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm tên..."
          className="w-full px-4 py-2 rounded-xl bg-white/80 border border-primary/20 text-sm text-secondary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
        <p className="text-secondary/50 text-xs mt-2">Aman Villa · 03–04/04/2026</p>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: "320px" }}>
        <table className="w-full">
          <thead className="sticky top-0">
            <tr className="bg-blush/60 backdrop-blur-sm">
              <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-secondary/40">Tên khách</th>
              <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-secondary/40">Phòng nghỉ</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-6 text-center text-sm text-secondary/40 italic">
                  Chưa có thông tin phân phòng
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-6 text-center text-sm text-secondary/40 italic">
                  Không tìm thấy kết quả
                </td>
              </tr>
            ) : filtered.map((row, i) => (
              <tr key={i} className={`border-t border-primary/10 ${i % 2 !== 0 ? "bg-blush/20" : ""}`}>
                <td className="px-6 py-3 text-sm text-secondary/70">{row.invitationName}</td>
                <td className="px-6 py-3 font-semibold text-sm whitespace-nowrap">
                {row.room ? <span className="text-secondary">{row.room}</span> : <span className="text-secondary/30 italic">Chưa phân phòng</span>}
              </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InfoSection({ guestName, refreshKey }: { guestName?: string; refreshKey?: number }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showFeed, setShowFeed] = useState(false);
  const [rooms, setRooms] = useState<RoomRow[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/guests/rooms`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: RoomRow[]) => { if (Array.isArray(data)) setRooms(data); })
      .catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    fetch(`${API_BASE}/photos`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (Array.isArray(data)) setPhotos(data.map((p: any) => ({ id: p._id, url: p.url, caption: p.caption, author: p.author, createdAt: new Date(p.createdAt).getTime() }))); })
      .catch(() => {});
  }, []);

  const addPhoto = (p: Photo) => setPhotos((prev) => [p, ...prev]);

  return (
    <section className="py-28 md:py-36 px-6 max-w-4xl mx-auto">
      <Reveal variants={stagger} className="text-center mb-16">
        <motion.span variants={fadeUp}
          className="text-sage font-bold text-xs uppercase tracking-[0.35em] mb-4 block flex items-center justify-center gap-2">
          <span className="w-5 h-px bg-sage/50" />Thông tin<span className="w-5 h-px bg-sage/50" />
        </motion.span>
        <motion.h3 variants={fadeUp} className="font-serif text-5xl text-secondary italic">
          Chi tiết chuyến đi
        </motion.h3>
        <motion.div variants={scaleIn}
          className="mt-6 mx-auto w-20 h-0.5 bg-gradient-to-r from-transparent via-sage/40 to-transparent" />
      </Reveal>

      <div className="space-y-10">
        {/* Photo Sharing Slide */}
        <PhotoSlide
          photos={photos}
          onUpload={() => setShowUpload(true)}
          onOpenFeed={() => setShowFeed(true)}
        />

        {/* Zalo Group */}
        <Reveal variants={fadeUp}>
          <div className="bg-gradient-to-r from-primary/10 to-blush rounded-3xl p-8 border border-primary/20 text-center">
            <div className="w-14 h-14 rounded-full bg-[#8DA06B]/15 flex items-center justify-center mx-auto mb-4">
              <Users size={26} className="text-[#8DA06B]" />
            </div>
            <h4 className="font-serif text-2xl text-secondary italic mb-2">Nhóm Zalo chuyến đi</h4>
            <p className="text-secondary/60 text-sm mb-5">Tham gia nhóm để cập nhật thông tin mới nhất về lịch trình và phòng ở.</p>
            <a href={ZALO_GROUP_LINK} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#8DA06B] hover:bg-[#7a8e5c] text-primary rounded-full font-bold text-sm tracking-wider transition-colors shadow-lg">
              <ExternalLink size={15} />
              Vào nhóm Zalo ngay
            </a>
          </div>
        </Reveal>

        {/* Room Assignments */}
        <Reveal variants={fadeUp}>
          <RoomTable rooms={rooms} />
        </Reveal>

        {/* Google Maps */}
        <Reveal variants={fadeUp}>
          <div className="rounded-3xl overflow-hidden shadow-lg border border-primary/20">
            <div className="bg-gradient-to-r from-sage/20 to-primary/10 px-8 py-5 border-b border-primary/15">
              <h4 className="font-serif text-2xl text-secondary italic flex items-center gap-3">
                <MapPin size={20} className="text-sage" /> Địa điểm tổ chức
              </h4>
              <p className="text-secondary/50 text-xs mt-1">Aman Villa</p>
            </div>
            <div className="relative w-full" style={{ paddingBottom: "55%" }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4575.994936717507!2d105.4499651!3d21.078918399999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31345f5e387a80a9%3A0x1dde36d6a6dbdab3!2sAman%20Villa!5e1!3m2!1svi!2s!4v1774630261747!5m2!1svi!2s"
                className="absolute inset-0 w-full h-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Aman Villa"
              />
            </div>
          </div>
        </Reveal>

        {/* Dress Code */}
        <Reveal variants={fadeUp}>
          <div className="rounded-3xl overflow-hidden shadow-lg border border-primary/20"
            style={{ background: 'linear-gradient(160deg, #f8f4ef 0%, #fdf6f0 50%, #f0f5ec 100%)' }}>
            {/* Color band */}
            <div className="h-1.5 w-full flex">
              <div className="flex-1" style={{ background: '#F2C8CD' }}/>
              <div className="flex-1" style={{ background: '#8DA06B' }}/>
              <div className="flex-1" style={{ background: '#D4C5A9' }}/>
              <div className="flex-1" style={{ background: '#1a1a1a' }}/>
            </div>
            <div className="px-8 py-8">
              <div className="text-center mb-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-secondary/40 mb-1">Wedding</p>
                <h4 className="font-serif text-3xl text-secondary italic">Dress Code</h4>
                <p className="text-secondary/50 text-sm mt-1.5">Hãy diện trang phục theo gam màu chủ đề 💕</p>
              </div>

              {/* Figures */}
              <div className="flex items-end justify-center gap-6 mb-7">
                <div className="text-center">
                  <BrideFigure />
                  <p className="text-[10px] font-semibold text-secondary/40 mt-1 tracking-wide uppercase">Cô dâu</p>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                  className="mb-16 text-2xl select-none">🤍</motion.div>
                <div className="text-center">
                  <GroomFigure />
                  <p className="text-[10px] font-semibold text-secondary/40 mt-1 tracking-wide uppercase">Chú rể</p>
                </div>
              </div>

              {/* Swatches */}
              <div className="flex flex-col gap-3 mb-6">
                {[
                  { label: 'Nữ', palette: [
                    { hex: '#F2C8CD', note: 'Hồng'    },
                    { hex: '#8DA06B', note: 'Xanh lá' },
                    { hex: '#D4C5A9', note: 'Be'      },
                    { hex: '#1a1a1a', note: 'Đen'     },
                  ]},
                  { label: 'Nam', palette: [
                    { hex: '#8DA06B', note: 'Xanh lá' },
                    { hex: '#D4C5A9', note: 'Be'      },
                    { hex: '#1a1a1a', note: 'Đen'     },
                  ]},
                ].map(({ label, palette }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-[9px] font-bold text-secondary/50 uppercase tracking-widest w-7 text-right shrink-0">{label}</span>
                    <div className="flex gap-2">
                      {palette.map((c) => (
                        <div key={c.note} className="flex flex-col items-center gap-1.5">
                          <div className="w-12 h-12 rounded-2xl shadow-md"
                            style={{ background: c.hex, border: c.hex === '#D4C5A9' ? '1px solid #c8b99a' : 'none' }} />
                          <p className="text-[9px] font-bold text-secondary/50 text-center leading-tight">{c.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Note */}
              <div className="bg-white/70 rounded-2xl px-4 py-3 text-center border border-black/5">
                <p className="text-xs text-secondary/60 leading-relaxed">
                  Trang phục không cần quá cứng nhắc — miễn là trong gam màu chủ đề và phù hợp với không gian tiệc cưới ngoài trời ✨
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <AnimatePresence>
        {showUpload && (
          <UploadPopup onClose={() => setShowUpload(false)} onAdd={addPhoto} defaultAuthor={guestName} />
        )}
        {showFeed && (
          <PhotoFeedPopup
            photos={photos}
            onClose={() => setShowFeed(false)}
            onUpload={() => { setShowFeed(false); setTimeout(() => setShowUpload(true), 200); }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

