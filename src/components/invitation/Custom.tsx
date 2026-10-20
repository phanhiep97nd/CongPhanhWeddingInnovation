import { motion, useReducedMotion } from "motion/react";
import type { CustomSection } from "../../lib/types";
import Photo from "./Photo";

export default function Custom({ section }: { section: CustomSection }) {
  const reduced = useReducedMotion();

  return (
    <section className="invite-section story-section" id={`custom-${section.id}`}>
      <motion.div
        className="invite-grid"
        initial={reduced ? false : { opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <h2>{section.title}</h2>
          <p className="preserve-lines">{section.body}</p>
        </div>
        {section.image && <Photo src={section.image} alt={section.title} className="story-image" />}
      </motion.div>
    </section>
  );
}
