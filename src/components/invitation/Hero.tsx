import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import type { Wedding, PublicGuest } from '../../lib/types';
import Photo from './Photo';
export default function Hero({ wedding, guest }: { wedding: Wedding; guest: PublicGuest | null }) {
  return <section className="invite-hero" aria-label="Thiệp cưới">
    <Photo src={wedding.coverImage} alt={`${wedding.couple.groom} và ${wedding.couple.bride}`} hero className="invite-hero-image" />
    <div className="invite-hero-shade" />
    <motion.div className="invite-hero-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9 }}>
      <span className="eyebrow">Trân trọng kính mời</span>
      {guest && <p className="invite-guest">{guest.invitationName}</p>}
      <h1>{wedding.couple.bride} <Heart aria-hidden size={24} className="inline-heart" /> {wedding.couple.groom}</h1>
      <p className="invite-date">{wedding.dateText}</p>
      {wedding.venue.name && <p>{wedding.venue.name}</p>}
      <a className="button" href="#first-section">Mở thiệp cưới</a>
    </motion.div>
  </section>;
}

