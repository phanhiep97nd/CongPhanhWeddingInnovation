import { Bus, Camera, Heart, Utensils } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { Wedding } from "../../lib/types";
const icons = [Bus, Camera, Heart, Utensils];

export default function Timeline({ wedding }: { wedding: Wedding }) {
  const reduced = useReducedMotion();
  return (
    <section className="invite-section white-section" id="timeline">
      <span className="text-sage font-bold text-xs uppercase tracking-[0.35em]">Lịch trình</span>
      <h2>Ngày chung đôi</h2>
      <p className="invite-date">{wedding.dateText}</p>
      {wedding.timeline.length === 0 ? (
        <p>Lịch trình sẽ được cập nhật tại đây.</p>
      ) : (
        <div className="original-timeline">
          {wedding.timeline.map((item, index) => {
            const Icon = icons[index % icons.length];
            return (
              <motion.article
                key={item.id}
                className={`original-timeline-item ${index % 2 ? "from-left" : "from-right"}`}
                initial={reduced ? false : { opacity: 0, x: index % 2 ? -60 : 60, y: 20 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="original-timeline-copy">
                  <time>{item.time}</time>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
                <span className="original-timeline-icon"><Icon size={20} aria-hidden /></span>
              </motion.article>
            );
          })}
        </div>
      )}
    </section>
  );
}
