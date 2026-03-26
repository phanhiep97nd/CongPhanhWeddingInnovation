/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import { 
  Menu, 
  ArrowRight, 
  Heart, 
  Calendar, 
  MapPin, 
  BookOpen, 
  Sparkles, 
  Image as ImageIcon,
  Bus,
  Camera,
  Utensils,
  Upload,
  ChevronRight,
  X
} from "lucide-react";

const IMAGES = {
  // Ảnh banner mới từ yêu cầu của bạn (sử dụng placeholder, hãy thay bằng link ảnh thật)
  hero: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop",
  overlap: "https://lh3.googleusercontent.com/aida-public/AB6AXuBt_VU2YU7cUOp3arHSuou72hGqTKEoW6JQcuUmeqOtwtoA9FXtv8o-ciQMBhDGPhiM-MffnsMbjkGgkxudk7fLu2Yf7DWZILu7BnlOab4EHAfpO4OH1sPn1sXjc5VK5iAoK5e4HzRrORZzeFAgVqqyXnDa78YqaX1buiXie3CDjljcK9lcVjMvEh9x_X3DLEKTMF1Z5NjUTmZR4b2Swl3r3b_DEkAQZPoqQAXgFjgVspeW0dA0pjrV2f2i6bX8ksnF43AzELNzlRYQ",
  hands: "https://lh3.googleusercontent.com/aida-public/AB6AXuDx_JNYUOe2cjss5T07M_4fs4aeo2HYlxEcz2MzTAk3xtpyBu_UuXSd42l5b4uV6Ym8hhanC59-mqsUarPU1aHFveZxxD1XVdt0bYYJYCfRmT_G7pcEINoa-U4pR_j4AqZR0yA7Gr_8c73mfL-5OE0uQHaEC6vkJP59xSKMC1IEQaX5e5Vn93xy_0sXedOfK2fM2YKQp8hswWAcLMvGp96468G_9_KpCg8ipxIiJAADIHi8mfkVjo_8Hl81h3dMRxdJsyiFsdbktsj1",
  table: "https://lh3.googleusercontent.com/aida-public/AB6AXuB4C6RTJGB3TyTlUBnemSuDiNDLEBvkUzh5PYtZ3Q3HCjf1llk__ZRcnVC3uTagODJYPE0RYcr29XbUmCWV2kA0HFE_NUWZeDcYrJ5BxSdZ5D7TKFBaim7Fu9c5mUcQZoajfylIQwpnpLdmoURY0auecH-oWroZ_BeeKqdfghBO8j2gAG1t8LEoB3Io2JAFjSH7IkJQKuubp433LhpjafHva28oVc4lpx2lMjQ0sOJb1BbnbbD9F9CH6MIbrUcicWJQaKvBMt2Lx4D_",
  garden: "https://picsum.photos/seed/garden/1920/1080",
  forest: "https://picsum.photos/seed/forest/1920/1080",
  gallery1: "https://picsum.photos/seed/wedding1/800/1000",
  gallery2: "https://picsum.photos/seed/wedding2/800/1000",
  gallery3: "https://picsum.photos/seed/wedding3/800/1000",
  gallery4: "https://picsum.photos/seed/wedding4/800/1000",
};

export default function App() {
  const [showRSVP, setShowRSVP] = useState(false);
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.15]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroBlur = useTransform(scrollYProgress, [0, 0.15], [0, 10]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 50]);
  const textY = useTransform(scrollYProgress, [0, 0.2], [0, -100]);

  useEffect(() => {
    // Hiện popup RSVP sau 1.5s khi vào trang lần đầu
    const timer = setTimeout(() => {
      setShowRSVP(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto snap-y snap-mandatory bg-stone-50 selection:bg-rose-100 scroll-smooth">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-md border-b border-white/20">
        <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Menu className="text-secondary cursor-pointer hover:scale-110 transition-transform" size={24} />
          </div>
          <h1 
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-2xl font-serif text-secondary tracking-tight italic font-bold cursor-pointer"
          >
            Eternal Us
          </h1>
          <button 
            onClick={() => setShowRSVP(true)}
            className="bg-secondary hover:bg-secondary/90 text-white px-6 py-1.5 rounded-full font-medium text-sm tracking-wide transition-all duration-300 shadow-md active:scale-95"
          >
            RSVP
          </button>
        </nav>
      </header>

      <main className="flex-grow">
        {/* Hero Section with Parallax */}
        <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden snap-start">
          <motion.div 
            style={{ scale: heroScale, y: heroY, filter: `blur(${heroBlur}px)` }}
            className="absolute inset-0 z-0"
          >
            <img 
              src={IMAGES.hero} 
              alt="Wedding Couple" 
              className="w-full h-full object-cover brightness-[0.85]"
              referrerPolicy="no-referrer"
            />
            {/* Smooth transition gradient at the bottom */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-stone-50/90"></div>
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-stone-50 to-transparent"></div>
          </motion.div>

          <motion.div 
            style={{ opacity: heroOpacity, y: textY }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
            className="relative z-10 text-center max-w-4xl mx-auto px-6"
          >
            <span className="font-sans text-xs uppercase tracking-[0.5em] text-white/90 mb-6 block drop-shadow-md">Save the Date</span>
            <h2 className="font-serif text-7xl md:text-9xl italic text-white mb-4 drop-shadow-2xl">Eternal Us</h2>
            <div className="flex items-center justify-center gap-4 text-white/90 mb-12">
              <div className="h-px w-12 bg-white/50"></div>
              <span className="font-serif text-2xl italic">October 24, 2025</span>
              <div className="h-px w-12 bg-white/50"></div>
            </div>
            <button 
              onClick={() => scrollTo('story')}
              className="group flex flex-col items-center gap-4 mx-auto text-white/80 hover:text-white transition-colors"
            >
              <span className="text-xs uppercase tracking-widest font-bold">Cuộn để xem tiếp</span>
              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <ChevronRight className="rotate-90" size={24} />
              </motion.div>
            </button>
          </motion.div>
        </section>

        {/* Content Sections */}
        <div id="story" className="relative z-10 snap-start min-h-screen flex items-center">
          <StorySection onRSVP={() => setShowRSVP(true)} />
        </div>
        
        <div id="timeline" className="snap-start min-h-screen flex items-center bg-white">
          <TimelineSection />
        </div>

        <div id="gallery" className="snap-start min-h-screen flex items-center">
          <GallerySection />
        </div>

        <div id="rsvp-section" className="snap-start min-h-screen flex items-center bg-stone-100">
          <div className="max-w-lg mx-auto px-6 w-full">
            <RSVPForm />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-16 flex flex-col items-center gap-8 text-center px-8 border-t border-stone-200 bg-white">
        <h4 className="font-serif text-3xl text-secondary font-bold italic">Eternal Us</h4>
        <nav className="flex flex-wrap justify-center gap-x-12 gap-y-4">
          <button onClick={() => scrollTo('story')} className="font-serif text-sm text-secondary/60 hover:text-secondary transition-all">Câu chuyện</button>
          <button onClick={() => scrollTo('timeline')} className="font-serif text-sm text-secondary/60 hover:text-secondary transition-all">Lịch trình</button>
          <button onClick={() => scrollTo('gallery')} className="font-serif text-sm text-secondary/60 hover:text-secondary transition-all">Bộ sưu tập</button>
          <button onClick={() => setShowRSVP(true)} className="font-serif text-sm text-secondary/60 hover:text-secondary transition-all">Xác nhận</button>
        </nav>
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-secondary hover:bg-secondary hover:text-white transition-all cursor-pointer">
              <Heart size={16} />
            </div>
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-secondary hover:bg-secondary hover:text-white transition-all cursor-pointer">
              <Camera size={16} />
            </div>
          </div>
          <p className="text-[10px] text-secondary/40 tracking-[0.3em] uppercase">© 2026 Eternal Us — Made with love</p>
        </div>
      </footer>

      {/* RSVP Popup Modal */}
      <AnimatePresence>
        {showRSVP && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRSVP(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setShowRSVP(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-stone-100 text-secondary hover:bg-rose-50 transition-colors z-10"
              >
                <X size={20} />
              </button>
              <div className="p-10">
                <RSVPForm onComplete={() => setShowRSVP(false)} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Floating Nav */}
      <nav className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-xl z-50 rounded-full shadow-2xl border border-stone-100">
        <button onClick={() => scrollTo('story')} className="p-2 text-secondary/60 hover:text-secondary transition-colors"><BookOpen size={20} /></button>
        <div className="w-px h-4 bg-stone-200 mx-1"></div>
        <button onClick={() => scrollTo('timeline')} className="p-2 text-secondary/60 hover:text-secondary transition-colors"><Sparkles size={20} /></button>
        <button 
          onClick={() => setShowRSVP(true)}
          className="mx-2 w-12 h-12 bg-secondary text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
        >
          <Heart size={20} className="fill-white" />
        </button>
        <button onClick={() => scrollTo('gallery')} className="p-2 text-secondary/60 hover:text-secondary transition-colors"><ImageIcon size={20} /></button>
        <div className="w-px h-4 bg-stone-200 mx-1"></div>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="p-2 text-secondary/60 hover:text-secondary transition-colors"><ChevronRight className="-rotate-90" size={20} /></button>
      </nav>
    </div>
  );
}

function StorySection({ onRSVP }: { onRSVP: () => void }) {
  return (
    <section className="max-w-7xl mx-auto px-6 py-32">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl">
            <img src={IMAGES.hands} alt="Our Hands" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="absolute -bottom-12 -right-12 w-48 h-64 rounded-3xl overflow-hidden shadow-2xl border-8 border-white hidden md:block">
            <img src={IMAGES.overlap} alt="Detail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex flex-col gap-8"
        >
          <span className="text-secondary/60 font-bold text-xs uppercase tracking-[0.3em]">Our Story</span>
          <h3 className="font-serif text-5xl md:text-6xl text-secondary leading-tight italic">Hành trình 8 năm <br/> kết tinh thành mãi mãi</h3>
          <p className="text-lg text-secondary/70 leading-relaxed">
            Từ những ngày đầu gặp gỡ vào năm 2017, chúng mình đã cùng nhau đi qua biết bao mùa nắng mưa. Mỗi khoảnh khắc sẻ chia, mỗi nụ cười và cả những thử thách đã gắn kết hai tâm hồn thành một.
          </p>
          <div className="grid grid-cols-2 gap-8 mt-4">
            <div>
              <h4 className="font-serif text-3xl text-secondary italic mb-2">2017</h4>
              <p className="text-xs uppercase tracking-widest text-secondary/50">Nơi bắt đầu</p>
            </div>
            <div>
              <h4 className="font-serif text-3xl text-secondary italic mb-2">2025</h4>
              <p className="text-xs uppercase tracking-widest text-secondary/50">Lễ thành hôn</p>
            </div>
          </div>
          <button 
            onClick={onRSVP}
            className="mt-8 self-start px-10 py-4 bg-secondary text-white rounded-full font-bold tracking-widest text-sm shadow-xl hover:-translate-y-1 transition-all"
          >
            XÁC NHẬN THAM DỰ
          </button>
        </motion.div>
      </div>
    </section>
  );
}

function TimelineSection() {
  const timelineItems = [
    { time: '14:00', title: 'Đón khách', desc: 'Chào đón những người thân yêu tại sảnh Glass Pavilion.', icon: <Bus size={20} /> },
    { time: '15:30', title: 'Chụp hình lưu niệm', desc: 'Cùng nhau lưu giữ những khoảnh khắc đẹp trước giờ làm lễ.', icon: <Camera size={20} /> },
    { time: '17:00', title: 'Lễ thành hôn', desc: 'Khoảnh khắc thiêng liêng trao nhau lời thề nguyện.', icon: <Heart size={20} /> },
    { time: '18:00', title: 'Tiệc tối', desc: 'Thưởng thức ẩm thực và chung vui cùng cô dâu chú rể.', icon: <Utensils size={20} /> },
  ];

  return (
    <section className="bg-white py-32">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-24">
          <span className="text-secondary/60 font-bold text-xs uppercase tracking-[0.3em] mb-4 block">Lịch trình</span>
          <h3 className="font-serif text-5xl text-secondary italic">Ngày chung đôi</h3>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-stone-100 -translate-x-1/2 hidden md:block"></div>
          
          <div className="space-y-20">
            {timelineItems.map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`flex flex-col md:flex-row items-center gap-8 ${i % 2 === 0 ? 'md:flex-row-reverse text-center md:text-right' : 'text-center md:text-left'}`}
              >
                <div className="md:w-1/2">
                  <span className="font-serif text-3xl text-secondary italic mb-2 block">{item.time}</span>
                  <h4 className="font-sans font-bold text-secondary mb-2">{item.title}</h4>
                  <p className="text-sm text-secondary/60 leading-relaxed max-w-xs mx-auto md:mx-0">{item.desc}</p>
                </div>
                
                <div className="relative z-10 w-12 h-12 rounded-full bg-stone-50 border border-stone-100 text-secondary flex items-center justify-center shadow-sm">
                  {item.icon}
                </div>
                
                <div className="md:w-1/2"></div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function GallerySection() {
  const photos = [
    { title: 'The First Glimpse', desc: 'Spring Afternoon', img: IMAGES.gallery1 },
    { title: 'A Bloom in Every Step', desc: 'Ceremony Details', img: IMAGES.gallery2, full: true },
    { title: 'Wildflower Soul', desc: 'Napa Valley', img: IMAGES.gallery3 },
    { title: 'The Grand Hall', desc: 'Celebration', img: IMAGES.gallery4, dark: true },
  ];

  return (
    <section className="py-32 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-24">
        <span className="text-secondary/60 font-bold text-xs uppercase tracking-[0.3em] mb-4 block">Gallery</span>
        <h3 className="font-serif text-5xl text-secondary italic">Khoảnh khắc hạnh phúc</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {photos.map((photo, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className={`relative rounded-[2.5rem] overflow-hidden group cursor-pointer ${photo.full ? 'md:col-span-2 aspect-[16/9]' : 'aspect-[4/5]'}`}
          >
            <img src={photo.img} alt={photo.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-10 text-white">
              <h4 className="font-serif text-2xl italic mb-1">{photo.title}</h4>
              <p className="text-sm opacity-80">{photo.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function RSVPForm({ onComplete }: { onComplete?: () => void }) {
  return (
    <div className="w-full">
      <div className="text-center mb-10">
        <Heart className="text-rose-400 mx-auto mb-4 fill-rose-400" size={40} />
        <h2 className="font-serif text-3xl text-secondary italic">Xác nhận tham dự</h2>
        <p className="text-secondary/60 mt-2 text-sm">Vui lòng phản hồi trước ngày 10/10/2025</p>
      </div>

      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onComplete?.(); }}>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2 ml-1">Họ và tên</label>
          <input 
            type="text" 
            required
            placeholder="Nhập tên của bạn"
            className="w-full px-6 py-4 rounded-2xl bg-stone-50 border-transparent focus:bg-white focus:border-stone-200 focus:ring-0 transition-all outline-none text-secondary"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2 ml-1">Số lượng khách</label>
          <select className="w-full px-6 py-4 rounded-2xl bg-stone-50 border-transparent focus:bg-white focus:border-stone-200 focus:ring-0 transition-all outline-none appearance-none text-secondary">
            <option>1 người</option>
            <option>2 người</option>
            <option>Cả gia đình</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary/40 mb-2 ml-1">Lời chúc</label>
          <textarea 
            rows={4}
            placeholder="Gửi lời chúc đến chúng mình..."
            className="w-full px-6 py-4 rounded-2xl bg-stone-50 border-transparent focus:bg-white focus:border-stone-200 focus:ring-0 transition-all outline-none resize-none text-secondary"
          ></textarea>
        </div>
        <button 
          type="submit"
          className="w-full py-5 bg-secondary text-white rounded-full font-bold tracking-widest shadow-xl hover:shadow-secondary/20 hover:-translate-y-0.5 transition-all active:scale-95"
        >
          GỬI XÁC NHẬN
        </button>
      </form>
    </div>
  );
}
