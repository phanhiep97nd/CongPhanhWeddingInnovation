import { motion } from "motion/react";
import type { CustomSection as CustomSectionData } from "../../../lib/types";
import Photo from "../Photo";
import { fadeLeft, fadeRight, fadeUp, stagger, Reveal } from "./shared";

export function CustomSection({ section }: { section: CustomSectionData }) {
  return (
    <section className="max-w-7xl mx-auto px-6 py-28 md:py-36">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        {section.image && (
          <Reveal variants={fadeLeft} className="relative">
            <motion.div variants={fadeLeft} className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl ring-4 ring-primary/20">
              <Photo src={section.image} alt={section.title} className="w-full h-full object-cover" />
            </motion.div>
          </Reveal>
        )}
        <Reveal variants={stagger} className="flex flex-col gap-7">
          <motion.h3 variants={fadeUp} className="font-serif text-5xl md:text-6xl text-secondary leading-tight italic">
            {section.title}
          </motion.h3>
          <motion.p variants={fadeRight} className="text-lg text-secondary/70 leading-relaxed whitespace-pre-line">
            {section.body}
          </motion.p>
        </Reveal>
      </div>
    </section>
  );
}
