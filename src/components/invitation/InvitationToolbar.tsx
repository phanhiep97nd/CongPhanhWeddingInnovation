import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Gift, MessageCircle, X } from 'lucide-react';
import { api, json } from '../../lib/api';
import type { Wedding } from '../../lib/types';
import GiftBoxSection from './original/GiftBoxSection';
import '../../styles/invitation-toolbar.css';
import '../../../api/data/blessings.js';

type Wish = { id: string; author: string; message: string };
declare global {
  interface Window { htBlessings: { samples: Wish[]; mount: (root: HTMLElement) => { set: (wishes: Wish[]) => void; destroy: () => void } } }
}
const examples: Wish[] = window.htBlessings.samples;

export default function InvitationToolbar({ slug, wedding, guestName = '', fixed = false, frame }: { key?: string; slug?: string; wedding?: Wedding; guestName?: string; fixed?: boolean; frame?: { current: HTMLIFrameElement | null } }) {
  const [wishes, setWishes] = useState<Wish[]>(slug ? [] : examples);
  const [panel, setPanel] = useState<'wish' | 'gift' | null>(null);
  const [author, setAuthor] = useState(guestName);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const sequence = useRef(0);
  const blessingRoot = useRef<HTMLDivElement>(null);
  const display = useRef<ReturnType<typeof window.htBlessings.mount> | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    const version = ++generation.current;
    setLoadError(''); setWishes(slug ? [] : examples);
    if (slug) api<Wish[]>(`/public/weddings/${encodeURIComponent(slug)}/wishes`).then(data => {
      if (version === generation.current) setWishes(current => [...new Map([...current, ...data].map(wish => [wish.id, wish])).values()].slice(0, 50));
    }).catch(error => { if (version === generation.current) setLoadError(error.message); });
    return () => { generation.current++; };
  }, [slug, retry]);
  useEffect(() => {
    if (frame || !blessingRoot.current) return;
    const mounted = window.htBlessings.mount(blessingRoot.current); display.current = mounted;
    return () => { mounted.destroy(); display.current = null; };
  }, [frame]);
  useEffect(() => {
    if (!frame) { display.current?.set(wishes); return; }
    const iframe = frame.current;
    const send = () => iframe?.contentWindow?.postMessage({ type: 'ht:blessings', wishes }, '*');
    const ready = (event: MessageEvent) => { if (event.source === iframe?.contentWindow && event.data?.type === 'ht:blessings-ready') send(); };
    iframe?.addEventListener('load', send); window.addEventListener('message', ready); send();
    return () => { iframe?.removeEventListener('load', send); window.removeEventListener('message', ready); };
  }, [wishes, frame]);
  useEffect(() => {
    if (panel) dialog.current?.showModal(); else dialog.current?.close();
  }, [panel]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    const version = generation.current;
    setBusy(true); setStatus('');
    try {
      const values = { author: author.trim(), message: message.trim() };
      if (!values.author || !values.message) { setStatus('Bạn hãy điền tên và lời chúc.'); return; }
      const wish = slug
        ? await api<Wish>(`/public/weddings/${encodeURIComponent(slug)}/wishes`, json('POST', values))
        : { ...values, id: `demo-${++sequence.current}` };
      if (version !== generation.current) return;
      setWishes(current => [wish, ...current].slice(0, 50));
      setMessage(''); setPanel(null);
    } catch (error) { if (version === generation.current) setStatus((error as Error).message); }
    finally { if (version === generation.current) setBusy(false); }
  }
  const hasGift = wedding?.entitlements?.giftBox && wedding.giftBox?.accounts.length;
  return <div className={`invitation-toolbar-layer${fixed ? ' invitation-toolbar-fixed' : ''}`}>
    {!frame && <div ref={blessingRoot} className="invitation-blessing-host" />}
    <nav className="invitation-toolbar" aria-label="Tương tác trên thiệp">
      <button type="button" onClick={event => { opener.current = event.currentTarget; setStatus(''); setPanel('wish'); }}><MessageCircle size={18} aria-hidden="true" /><span>Gửi lời chúc</span></button>
      <button type="button" onClick={event => { opener.current = event.currentTarget; setPanel('gift'); }}><Gift size={18} aria-hidden="true" /><span>Hộp quà</span></button>
    </nav>
    <dialog className="invitation-toolbar-dialog" ref={dialog} aria-label={panel === 'gift' ? 'Hộp quà' : 'Gửi lời chúc'} onCancel={event => event.stopPropagation()} onClose={() => { setPanel(null); opener.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) setPanel(null); }}>
      <button type="button" className="invitation-toolbar-close" aria-label="Đóng cửa sổ" onClick={() => setPanel(null)}><X size={22} /></button>
      {panel === 'wish' ? <><h2>Gửi lời chúc</h2>{!slug && <p>Thử gửi lời chúc để xem hiệu ứng. Lời chúc ở bản xem thử không được lưu.</p>}
        <form onSubmit={submit}><label>Tên của bạn<input required maxLength={100} value={author} onChange={event => setAuthor(event.target.value)} /></label><label>Lời chúc<textarea required maxLength={500} rows={3} value={message} onChange={event => setMessage(event.target.value)} /></label><button type="submit" className="button" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi lời chúc'}</button>{status && <p role="alert">{status}</p>}</form>
        {loadError && <p role="alert">{loadError} <button type="button" disabled={busy} onClick={() => setRetry(value => value + 1)}>Tải lại lời chúc</button></p>}
        <div className="invitation-wish-list" aria-label="Các lời chúc">{wishes.map(wish => <p key={wish.id}><strong>{wish.author}</strong><span>{wish.message}</span></p>)}</div>
      </> : panel === 'gift' ? <><h2>Hộp quà</h2>{hasGift && wedding ? <GiftBoxSection wedding={wedding} /> : <p>{slug ? 'Chủ thiệp chưa mở hộp quà. Cảm ơn bạn đã gửi những tình cảm tốt đẹp!' : 'Hộp quà sẽ hiển thị thông tin do chủ thiệp thiết lập khi gửi thiệp chính thức.'}</p>}</> : null}
    </dialog>
  </div>;
}
