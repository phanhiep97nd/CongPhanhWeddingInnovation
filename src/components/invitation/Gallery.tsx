import { useState } from 'react';
import type { Wedding } from '../../lib/types';
import Photo from './Photo';
export default function Gallery({ wedding }: { wedding: Wedding }) { const [selected, setSelected] = useState<string | null>(null); return <section className="invite-section blush-section" id="gallery"><span className="eyebrow">Khoảnh khắc</span><h2>Bộ sưu tập ảnh</h2><div className="gallery-grid">{wedding.gallery.map(item => <button className={`gallery-card ${item.full ? 'gallery-wide' : ''}`} key={item.id} onClick={() => setSelected(item.url)} aria-label={`Xem ảnh ${item.title}`}><Photo src={item.url} alt={item.title} /><span><strong>{item.title}</strong><small>{item.desc}</small></span></button>)}</div>{selected && <div className="lightbox" role="dialog" aria-label="Xem ảnh" onClick={() => setSelected(null)}><button aria-label="Đóng">×</button><Photo src={selected} alt="Ảnh cưới" /></div>}</section>; }

