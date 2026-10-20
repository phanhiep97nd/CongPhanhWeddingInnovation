// Ported verbatim from b47f907:src/App.tsx lines 1732-1867.
// Keep JSX structure and classNames; only swap hardcoded content for wedding data.

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, MapPin, Phone, Users, Music, ExternalLink,
  Info as InfoIcon, Volume2, VolumeX, Plus, Upload,
} from "lucide-react";
import { API_BASE, uploadToCloudinary, type Photo } from "./shared";

// ── Upload Popup ──────────────────────────────────────────────────────────────
export function UploadPopup({ onClose, onAdd, defaultAuthor }: { onClose: () => void; onAdd: (p: Photo) => void; defaultAuthor?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [author, setAuthor] = useState(defaultAuthor ?? "");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) pickFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      const url = await uploadToCloudinary(file);
      const body = { url, caption: caption.trim(), author: author.trim() || "Ẩn danh" };
      const res = await fetch(`${API_BASE}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const saved = res.ok ? await res.json() : null;
      onAdd({
        id: saved?._id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url,
        caption: body.caption,
        author: body.author,
        createdAt: saved ? new Date(saved.createdAt).getTime() : Date.now(),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div key="up-bd"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] bg-black/60" onClick={onClose} />
      <motion.div key="up-modal"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center pointer-events-none"
      >
        <div className="relative w-full sm:max-w-sm bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl pointer-events-auto max-h-[92vh] overflow-y-auto scrollbar-hide">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif text-xl text-secondary italic">Chia sẻ khoảnh khắc 📸</h3>
              <button onClick={onClose}
                className="p-1.5 rounded-full hover:bg-secondary/10 text-secondary/50 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div
                onClick={() => !preview && fileRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`relative rounded-2xl overflow-hidden border-2 border-dashed transition-colors ${
                  preview ? "border-primary/20" : "border-primary/30 bg-blush hover:bg-primary/10 cursor-pointer"
                }`}
              >
                {preview ? (
                  <>
                    <img src={preview} alt="preview" className="w-full object-cover max-h-52 rounded-2xl" />
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors">
                      <X size={13} />
                    </button>
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                      className="absolute bottom-2 right-2 text-[10px] bg-black/50 hover:bg-black/70 text-white rounded-full px-2.5 py-1 transition-colors">
                      Đổi ảnh
                    </button>
                  </>
                ) : (
                  <div className="py-10 flex flex-col items-center gap-2 text-secondary/35">
                    <Camera size={32} />
                    <span className="text-sm">Chọn ảnh hoặc kéo thả vào đây</span>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-1.5 ml-1">Tên của bạn</label>
                <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Nhập tên..."
                  className="w-full px-4 py-3 rounded-xl bg-blush border border-primary/20 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm transition-all" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-1.5 ml-1">Nội dung</label>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                  placeholder="Khoảnh khắc này thật..." rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-blush border border-primary/20 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm resize-none transition-all" />
              </div>

              <motion.button type="submit" disabled={!file || loading}
                whileHover={!file || loading ? {} : { y: -2 }}
                whileTap={!file || loading ? {} : { scale: 0.97 }}
                className="w-full py-3.5 bg-primary-dark hover:bg-primary-deep disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full font-bold text-sm tracking-wider transition-all flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang tải ảnh...
                  </>
                ) : (
                  <><Upload size={15} /> Chia sẻ ngay</>
                )}
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>
    </>
  );
}

