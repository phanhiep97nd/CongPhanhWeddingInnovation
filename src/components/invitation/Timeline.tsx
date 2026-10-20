import type { Wedding } from '../../lib/types';
export default function Timeline({ wedding }: { wedding: Wedding }) { return <section className="invite-section white-section" id="timeline"><span className="eyebrow">Ngày vui</span><h2>Lịch trình ngày cưới</h2><div className="timeline-list">{wedding.timeline.map(item => <article key={item.id} className="timeline-item"><time>{item.time}</time><div><h3>{item.title}</h3><p>{item.desc}</p></div></article>)}</div></section>; }

