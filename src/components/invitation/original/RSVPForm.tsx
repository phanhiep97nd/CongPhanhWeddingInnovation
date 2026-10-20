// Ported verbatim from b47f907:src/App.tsx lines 834-1063.
// Keep JSX structure and classNames; only swap hardcoded content for wedding data.

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Heart, BookOpen, Calendar, Image as ImageIcon,
  Bus, Camera, Utensils, ChevronRight, X, MapPin, Phone, Users, Music, ExternalLink,
  Info as InfoIcon, Volume2, VolumeX, Plus, Upload,
} from "lucide-react";
import { API_BASE } from "./shared";

// ── RSVP Form ─────────────────────────────────────────────────────────────────
export function RSVPForm({
  defaultName = "",
  guestId,
  onComplete,
  onConfirm,
}: {
  defaultName?: string;
  guestId?: string;
  onComplete?: () => void;
  onConfirm?: (newId?: string) => void;
}) {
  const [attendance, setAttendance] = useState<"yes" | "no" | null>(null);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState(1);
  const [wantRide, setWantRide] = useState<boolean | null>(null);
  const [pickupPoint, setPickupPoint] = useState("Nhà gái 183 Vũ Tông Phan");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!attendance) errs.attendance = "Vui lòng chọn tham dự hay không.";
    if (attendance === "yes") {
      if (!name.trim()) errs.name = "Vui lòng nhập họ tên.";
      if (!phone.trim()) errs.phone = "Vui lòng nhập số điện thoại.";
      else if (!/^[0-9]{9,11}$/.test(phone.replace(/\s/g, ""))) errs.phone = "Số điện thoại không hợp lệ.";
      if (guests < 1) errs.guests = "Số khách ít nhất là 1.";
      if (wantRide === null) errs.wantRide = "Vui lòng chọn hình thức di chuyển.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!validate()) return;
    submittingRef.current = true;
    setSubmitting(true);
    let newId: string | undefined;
    try {
      if (guestId) {
        await fetch(`${API_BASE}/guests/${guestId}/rsvp`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            attendance === "yes"
              ? { status: "yes", guestCount: guests, joinGroup: wantRide ?? false, pickupPoint: wantRide ? pickupPoint : "", phone, name }
              : { status: "no",  guestCount: 0, joinGroup: false, pickupPoint: "" }
          ),
        });
      } else if (attendance === "yes") {
        const res = await fetch(`${API_BASE}/guests/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invitationName: name.trim(),
            phone,
            status: "yes",
            guestCount: guests,
            joinGroup: wantRide ?? false,
            pickupPoint: wantRide ? pickupPoint : "",
          }),
        });
        if (res.ok) { const d = await res.json(); newId = d._id; }
      }
    } catch {}
    submittingRef.current = false;
    setSubmitting(false);
    if (attendance === "yes") onConfirm?.(newId);
    else onComplete?.();
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-6 pt-2">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Heart className="text-primary-dark fill-primary" size={28} />
        </div>
        <h2 className="font-serif text-3xl text-secondary italic">Xác nhận tham dự</h2>
      </div>

      {/* Departure time */}
      <div className="bg-gradient-to-r from-primary/10 to-blush rounded-2xl p-4 mb-6 border border-primary/20">
        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2">Thời gian khởi hành</p>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-secondary font-medium">🚌 14:00 · 03/04/2026 <span className="text-secondary/50 font-normal">(Lượt đi)</span></p>
          <p className="text-sm text-secondary font-medium">🏠 11:00 · 04/04/2026 <span className="text-secondary/50 font-normal">(Lượt về)</span></p>
        </div>
      </div>

      {/* Attendance selector */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-3">Bạn có tham dự không?</p>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => { setAttendance("yes"); setErrors(e => ({...e, attendance: ""})); }}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
              attendance === "yes" ? "border-primary-dark bg-primary/15" : errors.attendance ? "border-red-300 bg-red-50" : "border-primary/20 bg-blush hover:bg-primary/10"
            }`}>
            <span className="text-3xl">🥂</span>
            <span className="font-bold text-sm text-secondary">Nhất định rồi!</span>
          </button>
          <button type="button" onClick={() => { setAttendance("no"); setErrors(e => ({...e, attendance: ""})); }}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
              attendance === "no" ? "border-secondary/40 bg-secondary/10" : errors.attendance ? "border-red-300 bg-red-50" : "border-primary/20 bg-blush hover:bg-secondary/5"
            }`}>
            <span className="text-3xl">😔</span>
            <span className="font-bold text-sm text-secondary">Sorry...</span>
          </button>
        </div>
        {errors.attendance && <p className="text-xs text-red-500 mt-2 ml-1">{errors.attendance}</p>}
      </div>

      {/* Form – only if "yes" */}
      <AnimatePresence>
        {attendance === "yes" && (
          <motion.form
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handleSubmit} className="space-y-4"
          >
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2 ml-1">Họ và tên</label>
              <input type="text" value={name} onChange={(e) => { setName(e.target.value); setErrors(er => ({...er, name: ""})); }}
                placeholder="Nhập tên của bạn"
                className={`w-full px-5 py-3.5 rounded-2xl bg-blush border focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none text-secondary ${errors.name ? "border-red-400" : "border-primary/20 focus:border-primary"}`} />
              {errors.name && <p className="text-xs text-red-500 mt-1 ml-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2 ml-1 flex items-center gap-1">
                <Phone size={10} className="inline" /> Số điện thoại
              </label>
              <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setErrors(er => ({...er, phone: ""})); }}
                placeholder="0912 345 678"
                className={`w-full px-5 py-3.5 rounded-2xl bg-blush border focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none text-secondary ${errors.phone ? "border-red-400" : "border-primary/20 focus:border-primary"}`} />
              {errors.phone && <p className="text-xs text-red-500 mt-1 ml-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2 ml-1 flex items-center gap-1">
                <Users size={10} className="inline" /> Số lượng khách
              </label>
              <div className="flex items-center gap-0 rounded-2xl bg-blush border border-primary/20 overflow-hidden">
                <button type="button"
                  onClick={() => { setGuests(g => Math.max(1, g - 1)); setErrors(er => ({...er, guests: ""})); }}
                  className="w-14 h-14 text-2xl text-secondary/60 hover:bg-primary/10 transition-colors flex-shrink-0 flex items-center justify-center">
                  −
                </button>
                <span className="flex-1 text-center font-bold text-xl text-secondary select-none">{guests}</span>
                <button type="button"
                  onClick={() => { setGuests(g => Math.min(20, g + 1)); setErrors(er => ({...er, guests: ""})); }}
                  className="w-14 h-14 text-2xl text-secondary/60 hover:bg-primary/10 transition-colors flex-shrink-0 flex items-center justify-center">
                  +
                </button>
              </div>
              {errors.guests && <p className="text-xs text-red-500 mt-1 ml-1">{errors.guests}</p>}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-3 ml-1 flex items-center gap-1">
                <Bus size={10} className="inline" /> Có đi xe cùng đoàn không?
              </p>
              <div className="flex gap-3 mb-3">
                <button type="button" onClick={() => { setWantRide(true); setErrors(er => ({...er, wantRide: ""})); }}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    wantRide === true ? "border-primary-dark bg-primary/15 text-secondary" : errors.wantRide ? "border-red-300 bg-red-50 text-secondary/60" : "border-primary/20 bg-blush text-secondary/60 hover:bg-primary/10"
                  }`}>
                  Có, đi chung 🚌
                </button>
                <button type="button" onClick={() => { setWantRide(false); setErrors(er => ({...er, wantRide: ""})); }}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    wantRide === false ? "border-secondary/30 bg-secondary/10 text-secondary" : errors.wantRide ? "border-red-300 bg-red-50 text-secondary/60" : "border-primary/20 bg-blush text-secondary/60 hover:bg-secondary/5"
                  }`}>
                  Tự đến 🚗
                </button>
              </div>
              {errors.wantRide && <p className="text-xs text-red-500 mb-2 ml-1">{errors.wantRide}</p>}

              <AnimatePresence>
                {wantRide === true && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
                  >
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2 ml-1">Điểm đón</label>
                    <select value={pickupPoint} onChange={(e) => setPickupPoint(e.target.value)}
                      className="w-full px-5 py-3.5 rounded-2xl bg-blush border border-primary/20 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none text-secondary cursor-pointer">
                      <option value="Nhà gái 183 Vũ Tông Phan">📍 Nhà gái — 183 Vũ Tông Phan</option>
                      <option value="Nhà trai ngõ 4 Cầu Bươu">📍 Nhà trai — ngõ 4 Cầu Bươu</option>
                    </select>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button type="submit" disabled={submitting}
              whileHover={{ y: -2, boxShadow: "0 12px 40px rgba(201,132,139,0.4)" }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 bg-primary-dark hover:bg-primary-deep text-white rounded-full font-bold tracking-widest transition-colors mt-2 disabled:opacity-60">
              {submitting ? "Đang gửi..." : "GỬI XÁC NHẬN 💌"}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* "No" message */}
      <AnimatePresence>
        {attendance === "no" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-4"
          >
            <p className="text-center text-sm text-secondary/60 mb-4">Tiếc quá, sẽ nhớ bạn nhiều 😢</p>
            <button onClick={() => onComplete?.()}
              className="w-full py-4 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-full font-bold tracking-widest transition-colors">
              Đã hiểu, cảm ơn bạn
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

