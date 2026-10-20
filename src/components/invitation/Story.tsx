import { Heart } from "lucide-react";
import { motion } from "motion/react";
import type { Wedding } from "../../lib/types";
import Photo from "./Photo";
import Reveal, { fadeLeft, fadeRight, fadeUp, scaleIn, stagger } from "./Reveal";

export default function Story({ wedding, onRsvp }: { wedding: Wedding; onRsvp?: () => void }) {
  return (
    <section className="invite-section story-section" id="story">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center text-left">
        <Reveal variants={fadeLeft} className="relative">
          <motion.div variants={fadeLeft} className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl ring-4 ring-primary/20">
            <Photo src={wedding.story.image} alt={wedding.story.title} className="w-full h-full object-cover" />
          </motion.div>
          <motion.div variants={scaleIn} className="absolute bottom-4 right-4 md:-bottom-10 md:-right-8 bg-white rounded-3xl p-5 shadow-xl border border-primary/20">
            <Heart size={22} className="text-primary-dark fill-primary" aria-hidden />
          </motion.div>
        </Reveal>
        <Reveal variants={stagger} className="flex flex-col gap-7">
          <motion.span variants={fadeRight} className="text-sage font-bold text-xs uppercase tracking-[0.35em]">
            <span className="w-5 h-px bg-sage/50 inline-block align-middle mr-2" />
            Our Story
            <span className="w-5 h-px bg-sage/50 inline-block align-middle ml-2" />
          </motion.span>
          <motion.h2 variants={fadeUp} className="font-serif text-5xl md:text-6xl text-secondary leading-tight italic">
            {wedding.story.title || "Câu chuyện của chúng mình"}
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-secondary/70 leading-relaxed preserve-lines">
            {wedding.story.body}
          </motion.p>
          {onRsvp && (
            <motion.button variants={fadeUp} onClick={onRsvp} className="mt-1 self-start px-10 py-4 bg-primary-dark hover:bg-primary-deep text-white rounded-full font-bold tracking-widest text-sm shadow-lg">
              XÁC NHẬN THAM DỰ
            </motion.button>
          )}
        </Reveal>
      </div>
    </section>
  );
}
