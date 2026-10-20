import type { CustomSection } from '../../lib/types';
import Photo from './Photo';
export default function Custom({ section }: { section: CustomSection }) { return <section className="invite-section blush-section" id={`custom-${section.id}`}><div className="invite-grid"><div><span className="eyebrow">Dành cho bạn</span><h2>{section.title}</h2><p className="preserve-lines">{section.body}</p></div><Photo src={section.image} alt={section.title} className="story-image" /></div></section>; }

