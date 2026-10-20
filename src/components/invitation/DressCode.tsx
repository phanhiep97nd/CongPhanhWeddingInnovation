import type { Wedding } from '../../lib/types';
export default function DressCode({ wedding }: { wedding: Wedding }) { return <section className="invite-section blush-section" id="dressCode"><span className="eyebrow">Trang phục</span><h2>Trang phục</h2><p className="preserve-lines">{wedding.dressCode.note}</p><div className="color-swatches">{wedding.dressCode.colors.map((color, index) => <span key={index} title={color} style={{ background: color }} />)}</div></section>; }

