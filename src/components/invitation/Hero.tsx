import type { RefObject } from "react";
import { Heart, ChevronDown } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { PublicGuest, Wedding } from "../../lib/types";
import Photo from "./Photo";

export default function Hero({ wedding, guest, firstSection, containerRef }: {
  wedding: Wedding;
  guest: PublicGuest | null;
  firstSection: string;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ container: containerRef });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.14]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 90]);
  return (
    <section className="invite-hero" aria-label="Thiệp cưới">
      <motion.div className="invite-hero-media" style={reduced ? undefined : { scale, y }}>
        <Photo src={wedding.coverImage} alt={`${wedding.couple.groom} và ${wedding.couple.bride}`} hero className="invite-hero-image" />
      </motion.div>
      <div className="invite-hero-shade" />
      <div className="invite-hero-copy">
        <motion.h2
          initial={reduced ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="invite-hero-title"
        >
          Eternal Us
        </motion.h2>
        <p className="invite-hero-line">Love in
          <span className="infinity-8">8
          </span> dimensions
        </p>
        <h1 className="invite-hero-names">
          {wedding.couple.bride}
          <Heart aria-hidden size={18} className="inline-heart" />
          {wedding.couple.groom}
        </h1>
        <p className="invite-date">
          {wedding.dateText}
        </p>
        {guest && <p className="invite-guest">Trân trọng kính mời <span>{guest.invitationName}</span></p>}
        <a className="invite-scroll-cue" href={`#${firstSection}`}>
          Cuộn để xem tiếp
          <ChevronDown size={17} aria-hidden />
        </a>
      </div>
    </section>
  );
}
