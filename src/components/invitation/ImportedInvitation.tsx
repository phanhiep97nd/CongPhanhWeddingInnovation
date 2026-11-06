import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, json } from '../../lib/api';
import type { PublicGuest, Wedding } from '../../lib/types';
import { invitationTitle } from '../../lib/templateLibrary';
import InvitationToolbar from './InvitationToolbar';

export default function ImportedInvitation({ wedding, guest, slug }: { wedding: Wedding; guest: PublicGuest | null; slug: string }) {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [name, setName] = useState(guest?.invitationName || '');
  const [attendance, setAttendance] = useState<'yes' | 'no'>('yes');
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [guestCode, setGuestCode] = useState(guest?.code || '');
  const frame = useRef<HTMLIFrameElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!wedding.hasImportedTemplate) return;
    let active = true;
    api<{ html: string }>(`/public/weddings/${encodeURIComponent(slug)}/template-render${guest?.code ? `?g=${encodeURIComponent(guest.code)}` : ''}`).then(data => { if (active) setHtml(data.html); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [slug, guest?.code, wedding.hasImportedTemplate]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'ht:rsvp') dialog.current?.showModal();
      // Map buttons inside the sandboxed card ask the page to open the owner's map link; only web links are opened.
      if (event.data?.type === 'ht:link' && typeof event.data.url === 'string' && /^https?:\/\//i.test(event.data.url)) window.open(event.data.url, '_blank', 'noopener,noreferrer');
    };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, []);
  async function rsvp(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setMessage('');
    try {
      const prefix = `/public/weddings/${encodeURIComponent(slug)}`;
      const result = await api<PublicGuest>(guestCode ? `${prefix}/guests/${encodeURIComponent(guestCode)}/rsvp` : `${prefix}/register`, json(guestCode ? 'PUT' : 'POST', { invitationName: name.trim(), status: attendance, guestCount: attendance === 'yes' ? count : 0 }));
      if (result.code) setGuestCode(result.code);
      setMessage('Đã gửi xác nhận. Cảm ơn bạn đã hồi đáp!');
    } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  }
  return <main className="imported-invitation">
    {error ? <p role="alert">{error}</p> : wedding.hasImportedTemplate ? html ? <div className="imported-template-frame invitation-toolbar-host"><iframe ref={frame} title={invitationTitle(wedding)} sandbox="allow-scripts" srcDoc={html} /><InvitationToolbar frame={frame} key={slug} slug={slug} wedding={wedding} guestName={guest?.invitationName} /></div> : <p className="page-loading">Đang mở thiệp…</p> : <section className="event-invitation"><p>Trân trọng kính mời {guest?.invitationName || 'bạn'}</p><h1>{invitationTitle(wedding)}</h1>{wedding.coverImage && <img src={wedding.coverImage} alt="Ảnh sự kiện" />}<p>{wedding.dateText} · {wedding.eventTime}</p><h2>{wedding.venue.name}</h2><p>{wedding.venue.address}</p><p>{wedding.story.body}</p></section>}
    {/* Library cards show only the card; their own RSVP buttons open the dialog below. */}
    {!wedding.hasImportedTemplate && <div className="invitation-actions"><span>{guest ? `Kính mời ${guest.invitationName}` : invitationTitle(wedding)}</span><button type="button" className="button" onClick={() => dialog.current?.showModal()}>Xác nhận tham dự</button>{wedding.venue.mapUrl && <a href={wedding.venue.mapUrl} target="_blank" rel="noopener noreferrer">Bản đồ ↗</a>}</div>}
    <dialog ref={dialog} className="rsvp-dialog"><button className="dialog-close" aria-label="Đóng xác nhận" onClick={() => dialog.current?.close()}>✕</button><h2>Hẹn gặp bạn trong ngày vui</h2><form onSubmit={rsvp}><label>Tên khách mời<input required maxLength={100} value={name} disabled={Boolean(guestCode)} onChange={e => setName(e.target.value)} /></label><label>Bạn có thể đến không?<select value={attendance} onChange={e => setAttendance(e.target.value as 'yes' | 'no')}><option value="yes">Mình sẽ tham dự</option><option value="no">Tiếc quá, mình không thể đến</option></select></label>{attendance === 'yes' && <label>Số người tham dự<input type="number" min={1} max={20} required value={count} onChange={e => setCount(Number(e.target.value))} /></label>}<button className="button" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi xác nhận'}</button>{message && <p role="status">{message}</p>}</form></dialog>
    {wedding.showBranding && <a className="invitation-brand" href="/">Tạo thiệp cùng Hỷ Thiệp</a>}
  </main>;
}
