/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { 
  Menu, 
  ArrowRight, 
  Heart, 
  Calendar, 
  MapPin, 
  BookOpen, 
  Sparkles, 
  Image as ImageIcon 
} from "lucide-react";

const IMAGES = {
  hero: "https://lh3.googleusercontent.com/aida/ADBb0uhH77wE1E01fr5xp1yfGELSVHBVieO4qplafW7Cbkx_vJvTJZBqqvTmujoS3jOJvzEda-Pibzdc7ViUuVavfYYfYRLX15lbazIhUBazdKYhcrRdHycTPMpS8Nh4DW8BsUZi7C1dNMm07G1KkSC5glHTLFXbasasopyf9bNpqH1QLXxrDlUvrMsHpoIq2jw4rJK3b4p_JbJoA9AgTHEA5vcNZCLEtST22cuNMCEQMh5Yr8MYDFi1dYpLy7UmsbwcTrt8LsWMvstcFpI",
  overlap: "https://lh3.googleusercontent.com/aida-public/AB6AXuBt_VU2YU7cUOp3arHSuou72hGqTKEoW6JQcuUmeqOtwtoA9FXtv8o-ciQMBhDGPhiM-MffnsMbjkGgkxudk7fLu2Yf7DWZILu7BnlOab4EHAfpO4OH1sPn1sXjc5VK5iAoK5e4HzRrORZzeFAgVqqyXnDa78YqaX1buiXie3CDjljcK9lcVjMvEh9x_X3DLEKTMF1Z5NjUTmZR4b2Swl3r3b_DEkAQZPoqQAXgFjgVspeW0dA0pjrV2f2i6bX8ksnF43AzELNzlRYQ",
  hands: "https://lh3.googleusercontent.com/aida-public/AB6AXuDx_JNYUOe2cjss5T07M_4fs4aeo2HYlxEcz2MzTAk3xtpyBu_UuXSd42l5b4uV6Ym8hhanC59-mqsUarPU1aHFveZxxD1XVdt0bYYJYCfRmT_G7pcEINoa-U4pR_j4AqZR0yA7Gr_8c73mfL-5OE0uQHaEC6vkJP59xSKMC1IEQaX5e5Vn93xy_0sXedOfK2fM2YKQp8hswWAcLMvGp96468G_9_KpCg8ipxIiJAADIHi8mfkVjo_8Hl81h3dMRxdJsyiFsdbktsj1",
  table: "https://lh3.googleusercontent.com/aida-public/AB6AXuB4C6RTJGB3TyTlUBnemSuDiNDLEBvkUzh5PYtZ3Q3HCjf1llk__ZRcnVC3uTagODJYPE0RYcr29XbUmCWV2kA0HFE_NUWZeDcYrJ5BxSdZ5D7TKFBaim7Fu9c5mUcQZoajfylIQwpnpLdmoURY0auecH-oWroZ_BeeKqdfghBO8j2gAG1t8LEoB3Io2JAFjSH7IkJQKuubp433LhpjafHva28oVc4lpx2lMjQ0sOJb1BbnbbD9F9CH6MIbrUcicWJQaKvBMt2Lx4D_"
};

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-rose-50/80 backdrop-blur-md shadow-sm">
        <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Menu className="text-secondary cursor-pointer hover:scale-110 transition-transform" size={24} />
          </div>
          <h1 className="text-2xl font-serif text-secondary tracking-tight italic font-bold">Eternal Us</h1>
          <button className="bg-primary hover:bg-rose-300 text-white px-6 py-1.5 rounded-full font-medium text-sm tracking-wide transition-all duration-300 shadow-md active:scale-95">
            RSVP
          </button>
        </nav>
      </header>

      <main className="flex-grow pb-24 md:pb-0">
        {/* Hero Section */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src={IMAGES.hero} 
              alt="Wedding Couple" 
              className="w-full h-full object-cover brightness-[0.95] hero-mask"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background-light"></div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative z-10 text-center max-w-4xl mx-auto"
          >
            <div className="mb-8 flex justify-center items-center gap-4">
              <div className="w-12 h-px bg-secondary/30"></div>
              <span className="font-sans text-xs uppercase tracking-[0.3em] text-secondary font-bold">Established October 2017</span>
              <div className="w-12 h-px bg-secondary/30"></div>
            </div>

            <div className="relative inline-block mb-4">
              <h2 className="font-serif text-7xl md:text-9xl editorial-text-shadow italic leading-tight text-secondary">
                Eternal Us
              </h2>
              {/* Artistic Overlap Image */}
              <motion.div 
                initial={{ rotate: 0, scale: 0.8 }}
                whileInView={{ rotate: 6, scale: 1 }}
                viewport={{ once: true }}
                className="absolute -top-12 -right-12 w-24 h-32 md:w-32 md:h-44 hidden md:block rounded-xl overflow-hidden shadow-2xl border-4 border-white"
              >
                <img src={IMAGES.overlap} alt="Invitation Detail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </motion.div>
            </div>

            <div className="flex flex-col items-center gap-2 mt-8">
              <div className="flex items-baseline gap-4">
                <span className="font-serif text-5xl md:text-7xl opacity-80 text-secondary">8</span>
                <span className="font-serif text-5xl md:text-7xl inline-block infinity-symbol translate-y-2 text-secondary">8</span>
                <span className="font-serif text-5xl md:text-7xl opacity-80 text-secondary">years</span>
              </div>
              <p className="font-sans text-lg md:text-xl max-w-md mx-auto mt-4 leading-relaxed text-secondary">
                A journey of <span className="text-rose-400 italic font-bold">eight years</span> blossoming into forever.
              </p>
            </div>

            <div className="mt-12">
              <button className="px-10 py-4 bg-gradient-to-r from-primary to-rose-300 text-white rounded-full font-bold tracking-widest text-sm shadow-xl hover:shadow-rose-200 transition-all duration-500 hover:-translate-y-1 active:scale-95">
                KINDLY RSVP
              </button>
            </div>
          </motion.div>
        </section>

        {/* Story Section */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="md:col-span-7 bg-rose-50/70 p-10 md:p-16 rounded-5xl flex flex-col justify-center relative overflow-hidden shadow-sm"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <BookOpen size={120} className="text-secondary" />
              </div>
              <span className="text-secondary font-bold text-xs uppercase tracking-widest mb-6 block">Our Journey</span>
              <h3 className="font-serif text-4xl md:text-5xl mb-8 leading-tight text-secondary">
                From a shared glance to a <span className="italic opacity-80">shared life.</span>
              </h3>
              <p className="text-lg leading-relaxed mb-8 text-secondary/80">
                Since that crisp October evening in 2017, our story has been written in laughter, quiet mornings, and the unwavering support of our closest friends and family.
              </p>
              <a href="#" className="inline-flex items-center text-secondary font-bold tracking-wider hover:translate-x-2 transition-transform duration-300">
                READ OUR STORY
                <ArrowRight className="ml-2" size={20} />
              </a>
            </motion.div>

            <div className="md:col-span-5 flex flex-col gap-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="h-full bg-rose-50/70 rounded-5xl p-10 flex flex-col items-center justify-center text-center shadow-sm"
              >
                <div className="w-20 h-20 bg-white/60 rounded-full flex items-center justify-center mb-6 shadow-sm border border-rose-100">
                  <Heart className="text-secondary fill-secondary" size={32} />
                </div>
                <h4 className="font-serif text-2xl mb-4 text-secondary">The Promise</h4>
                <p className="text-sm px-4 text-secondary/70 leading-relaxed italic">
                  "In your arms, I have found a home. In your heart, I have found my soul."
                </p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="aspect-[4/3] rounded-5xl overflow-hidden shadow-lg"
              >
                <img src={IMAGES.hands} alt="Holding Hands" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Details Section */}
        <section className="bg-white py-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="md:w-1/2 relative"
            >
              <div className="w-full aspect-square bg-rose-50 rounded-full absolute -top-12 -left-12 opacity-50"></div>
              <img 
                src={IMAGES.table} 
                alt="Table Setting" 
                className="relative z-10 w-full rounded-4xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="md:w-1/2 text-left"
            >
              <span className="text-rose-400 font-bold text-xs uppercase tracking-widest mb-4 block">The Celebration</span>
              <h3 className="font-serif text-5xl mb-10 leading-tight italic text-secondary">When & Where</h3>
              <div className="space-y-12">
                <div className="flex gap-6 items-start">
                  <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                    <Calendar className="text-rose-400" size={24} />
                  </div>
                  <div>
                    <h5 className="font-serif text-xl mb-1 italic text-secondary">The Date</h5>
                    <p className="text-secondary font-medium">Saturday, October 18, 2025</p>
                    <p className="text-sm mt-1 uppercase tracking-widest text-secondary/60">Ceremony at 4:30 PM</p>
                  </div>
                </div>
                <div className="flex gap-6 items-start">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <MapPin className="text-secondary" size={24} />
                  </div>
                  <div>
                    <h5 className="font-serif text-xl mb-1 italic text-secondary">The Venue</h5>
                    <p className="text-secondary font-medium">The Glass Pavilion at Willow Creek</p>
                    <p className="text-sm mt-1 text-secondary/60">123 Meadow Lane, Napa Valley</p>
                    <button className="mt-4 text-secondary font-bold text-xs border-b border-secondary/20 pb-1 hover:border-secondary transition-all">
                      VIEW MAP
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 flex flex-col items-center gap-6 text-center px-8 border-t border-rose-100 bg-zinc-50">
        <h4 className="font-serif text-xl text-secondary font-bold italic">Eternal Us</h4>
        <nav className="flex gap-8">
          <a href="#" className="font-serif text-sm text-secondary/60 hover:text-secondary transition-all">RSVP</a>
          <a href="#" className="font-serif text-sm text-secondary/60 hover:text-secondary transition-all">Timeline</a>
          <a href="#" className="font-serif text-sm text-secondary/60 hover:text-secondary transition-all">Gallery</a>
        </nav>
        <p className="text-xs text-secondary/40 tracking-widest uppercase">© 2026 Eternal Us — Celebrating Our Love</p>
      </footer>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-white/90 backdrop-blur-xl z-50 rounded-t-4xl shadow-2xl">
        <div className="flex flex-col items-center text-rose-300 hover:text-rose-400 transition-colors">
          <BookOpen size={20} />
          <span className="text-[10px] uppercase tracking-widest mt-1 font-bold">Story</span>
        </div>
        <div className="flex flex-col items-center bg-rose-100 text-rose-900 rounded-full px-5 py-2 scale-110 shadow-sm">
          <Heart size={20} className="fill-rose-900" />
          <span className="text-[10px] uppercase tracking-widest mt-1 font-bold">RSVP</span>
        </div>
        <div className="flex flex-col items-center text-rose-300 hover:text-rose-400 transition-colors">
          <Sparkles size={20} />
          <span className="text-[10px] uppercase tracking-widest mt-1 font-bold">Timeline</span>
        </div>
        <div className="flex flex-col items-center text-rose-300 hover:text-rose-400 transition-colors">
          <ImageIcon size={20} />
          <span className="text-[10px] uppercase tracking-widest mt-1 font-bold">Gallery</span>
        </div>
      </nav>
    </div>
  );
}
