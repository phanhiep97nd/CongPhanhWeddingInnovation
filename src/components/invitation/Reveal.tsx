import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.85, ease } },
};

export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -70 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.85, ease } },
};

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: 70 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.85, ease } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
};

export default function Reveal({ children, className = "", variants = stagger }: {
  children: ReactNode;
  className?: string;
  variants?: Variants;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={variants}
      initial={reduced ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}
