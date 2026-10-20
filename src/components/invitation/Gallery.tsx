import { useState } from "react";
import { Heart } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { Wedding } from "../../lib/types";
import Photo from "./Photo";

type GalleryItem = Wedding["gallery"][number];

function GalleryCard({ item, index, active, onToggle }: {
  item: GalleryItem;
  index: number;
  active: boolean;
  onToggle: () => void;
  key?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.button
      className={`gallery-card ${item.full ? "gallery-wide" : ""} ${active ? "gallery-active" : ""}`}
      onClick={onToggle}
      aria-label={`Xem ảnh ${item.title}`}
      aria-pressed={active}
      initial={reduced ? false : { opacity: 0, y: 50, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <Photo src={item.url} alt={item.title} />
      <span className="gallery-card-overlay">
        <Heart size={16} fill="currentColor" aria-hidden />
        <strong>{item.title}</strong>
        <small>{item.desc}</small>
      </span>
    </motion.button>
  );
}

export default function Gallery({ wedding }: { wedding: Wedding }) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section className="invite-section blush-section" id="gallery">
      <span className="text-sage font-bold text-xs uppercase tracking-[0.35em]">Gallery</span>
      <h2>Khoảnh khắc hạnh phúc</h2>
      {wedding.gallery.length === 0 ? (
        <p>Ảnh cưới sẽ được cập nhật tại đây.</p>
      ) : (
        <div className="gallery-grid">
          {wedding.gallery.map((item, index) => (
            <GalleryCard
              key={item.id}
              item={item}
              index={index}
              active={active === index}
              onToggle={() => setActive(active === index ? null : index)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
