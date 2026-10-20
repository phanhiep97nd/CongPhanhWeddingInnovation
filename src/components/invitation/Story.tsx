import { motion } from 'motion/react';
import type { Wedding } from '../../lib/types';
import Photo from './Photo';
export default function Story({ wedding }: { wedding: Wedding }) { return <section className="invite-section story-section" id="story"><div className="invite-grid">
  <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}><Photo src={wedding.story.image} alt={wedding.story.title} className="story-image" /></motion.div>
  <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}><span className="eyebrow">Câu chuyện</span><h2>{wedding.story.title || 'Câu chuyện của chúng mình'}</h2><p className="preserve-lines">{wedding.story.body}</p></motion.div>
  </div></section>; }

