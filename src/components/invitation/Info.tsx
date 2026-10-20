import { ExternalLink, MapPin, Users } from "lucide-react";
import { motion } from "motion/react";
import type { Wedding } from "../../lib/types";
import Reveal, { fadeUp, scaleIn, stagger } from "./Reveal";

export default function Info({ wedding }: { wedding: Wedding }) {
  return (
    <section className="invite-section white-section" id="info">
      <div className="max-w-4xl mx-auto">
        <Reveal variants={stagger} className="text-center mb-16">
          <motion.span variants={fadeUp} className="text-sage font-bold text-xs uppercase tracking-[0.35em] block mb-4">
            Thông tin
          </motion.span>
          <motion.h2 variants={fadeUp} className="font-serif text-5xl text-secondary italic">
            Chi tiết chuyến đi
          </motion.h2>
          <motion.div variants={scaleIn} className="mt-6 mx-auto w-20 h-0.5 bg-sage/40" />
        </Reveal>
        <div className="space-y-10">
          {wedding.zaloGroupLink && (
            <Reveal variants={fadeUp}>
              <div className="bg-blush rounded-3xl p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-sage/15 flex items-center justify-center mx-auto mb-4">
                  <Users size={26} className="text-sage" aria-hidden />
                </div>
                <h3 className="font-serif text-2xl text-secondary italic mb-2">Nhóm Zalo chuyến đi</h3>
                <p className="text-secondary/70 text-sm mb-5">Tham gia nhóm để cập nhật thông tin mới nhất về lịch trình và phòng ở.</p>
                <a href={wedding.zaloGroupLink} target="_blank" rel="noopener noreferrer" className="button">
                  <ExternalLink size={15} aria-hidden /> Vào nhóm Zalo ngay
                </a>
              </div>
            </Reveal>
          )}
          <Reveal variants={fadeUp}>
            <div className="rounded-3xl overflow-hidden shadow-lg text-left">
              <div className="bg-sage/20 px-8 py-5">
                <h3 className="font-serif text-2xl text-secondary italic flex items-center gap-3">
                  <MapPin size={20} className="text-sage" aria-hidden /> Địa điểm tổ chức
                </h3>
                <p className="text-secondary/70 text-sm mt-1">{wedding.venue.name}</p>
              </div>
              <div className="p-8">
                <p className="invite-date">{wedding.dateText}</p>
                <p>{wedding.venue.address}</p>
                {wedding.venue.mapUrl && (
                  <a className="button-outline mt-5" href={wedding.venue.mapUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={15} aria-hidden /> Xem bản đồ
                  </a>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
