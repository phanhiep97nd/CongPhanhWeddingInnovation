import { Heart, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { PublicGuest, Wedding } from "../../lib/types";
import Photo from "./Photo";

export default function InvitePopup({ wedding, guest, rsvpEnabled, onClose, onRsvp }: {
  wedding: Wedding;
  guest: PublicGuest | null;
  rsvpEnabled: boolean;
  onClose: () => void;
  onRsvp: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <div className="invite-popup-backdrop" role="dialog" aria-modal="true" aria-label="Lời mời cưới">
      <motion.div
        className="invite-popup"
        initial={reduced ? false : { opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
      >
        <div className="invite-popup-cover">
          <Photo src={wedding.coverImage} alt="" />
          <button onClick={onClose} aria-label="Đóng lời mời"><X size={20} /></button>
        </div>
        <div className="invite-popup-copy">
          <Heart size={36} fill="currentColor" aria-hidden />
          <p>Trân trọng kính mời <strong>{guest?.invitationName || "bạn"}</strong> đến chung vui trong ngày trọng đại của</p>
          <h2>{wedding.couple.bride} &amp; {wedding.couple.groom}</h2>
          <p>{wedding.dateText}{wedding.venue.name ? ` · ${wedding.venue.name}` : ""}</p>
          <button className="button" onClick={rsvpEnabled ? onRsvp : onClose}>
            {rsvpEnabled && guest?.status !== "yes" ? "Xác nhận tham dự" : "Xem lời mời"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
