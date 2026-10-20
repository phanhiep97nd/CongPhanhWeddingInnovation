import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { PublicGuest, Wedding } from '../lib/types';
import { sectionLabel } from '../lib/sections';
import Hero from '../components/invitation/Hero';
import Story from '../components/invitation/Story';
import Timeline from '../components/invitation/Timeline';
import Gallery from '../components/invitation/Gallery';
import Info from '../components/invitation/Info';
import Rsvp from '../components/invitation/Rsvp';
import PhotoWall from '../components/invitation/PhotoWall';
import Rooms from '../components/invitation/Rooms';
import DressCode from '../components/invitation/DressCode';
import Custom from '../components/invitation/Custom';
import InvitePopup from '../components/invitation/InvitePopup';

export default function Invitation() {
  const { slug = '', code } = useParams(); const [wedding, setWedding] = useState<Wedding | null>(null); const [guest, setGuest] = useState<PublicGuest | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [roomsRefresh, setRoomsRefresh] = useState(0); const [playing, setPlaying] = useState(false); const [showInvite, setShowInvite] = useState(false); const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => { let active = true; setLoading(true); setError(''); setShowInvite(false); Promise.all([api<Wedding>(`/public/weddings/${encodeURIComponent(slug)}`), code ? api<PublicGuest>(`/public/weddings/${encodeURIComponent(slug)}/guests/${encodeURIComponent(code)}`) : Promise.resolve(null)]).then(([w, g]) => { if (active) { setWedding(w); setGuest(g); } }).catch(e => { if (active) setError(e instanceof ApiError && e.status === 404 ? 'Không tìm thấy thiệp cưới này.' : (e as Error).message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [slug, code]);
  useEffect(() => { if (!wedding) return; document.title = wedding.meta.title || `Thiệp cưới ${wedding.couple.groom} & ${wedding.couple.bride}${wedding.dateText ? ' — ' + wedding.dateText : ''}`; let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]'); if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.append(meta); } meta.content = wedding.meta.description || `Trân trọng kính mời ${guest?.invitationName || 'bạn'} đến chung vui trong ngày trọng đại của ${wedding.couple.groom} & ${wedding.couple.bride}${wedding.venue.name ? ' tại ' + wedding.venue.name : ''}.`; }, [wedding, guest]);
  useEffect(() => { if (!wedding) return; const timer = window.setTimeout(() => setShowInvite(true), 2500); return () => window.clearTimeout(timer); }, [wedding?.id]);
  const visible = useMemo(() => wedding?.sections.filter(s => s.enabled) || [], [wedding?.sections]);
  if (loading) return <p className="page-loading">Đang mở thiệp...</p>;
  if (error || !wedding) return <main className="shell not-found"><h1>{error || 'Không tìm thấy thiệp cưới này.'}</h1><a href="/">Về trang chủ</a></main>;
  function render(key: string) { if (!wedding) return null; switch (key) { case 'story': return <Story wedding={wedding} />; case 'timeline': return <Timeline wedding={wedding} />; case 'gallery': return <Gallery wedding={wedding} />; case 'info': return <Info wedding={wedding} />; case 'rsvp': return <Rsvp slug={slug} guest={guest} onSaved={g => { setGuest(g); setRoomsRefresh(v => v + 1); }} />; case 'photoWall': return <PhotoWall slug={slug} defaultAuthor={guest?.invitationName} />; case 'rooms': return <Rooms slug={slug} refresh={roomsRefresh} />; case 'dressCode': return <DressCode wedding={wedding} />; default: { const custom = wedding.customSections.find(s => key === `custom:${s.id}`); return custom ? <Custom section={custom} /> : null; } } }
  async function toggleMusic() { if (!audio.current) return; if (playing) { audio.current.pause(); setPlaying(false); } else { try { await audio.current.play(); setPlaying(true); } catch { setPlaying(false); } } }
  return <div className="invitation" style={{ '--wedding-primary': wedding.theme.primary || '#b76e79' } as CSSProperties}><Hero wedding={wedding} guest={guest} /><nav className="invite-nav" aria-label="Các hạng mục thiệp">{visible.map(s => <a key={s.key} href={`#${s.key.startsWith('custom:') ? s.key.replace(':', '-') : s.key}`}>{sectionLabel(s.key, wedding.customSections)}</a>)}</nav><main id="first-section">{visible.map(s => <div key={s.key}>{render(s.key)}</div>)}</main><footer className="invite-footer"><h2>{wedding.couple.bride} & {wedding.couple.groom}</h2><p>Cảm ơn bạn đã chung vui cùng chúng mình</p></footer>{wedding.musicUrl && <><audio ref={audio} src={wedding.musicUrl} preload="none" loop /><button className="music-button" onClick={() => void toggleMusic()} aria-label={playing ? 'Tắt nhạc' : 'Bật nhạc'}>{playing ? '♫' : '♪'}</button></>}{showInvite && <InvitePopup wedding={wedding} guest={guest} onClose={() => setShowInvite(false)} onRsvp={() => { setShowInvite(false); document.getElementById(wedding.sections.some(s => s.key === 'rsvp' && s.enabled) ? 'rsvp' : 'first-section')?.scrollIntoView({ behavior: 'smooth' }); }} />}</div>;
}




