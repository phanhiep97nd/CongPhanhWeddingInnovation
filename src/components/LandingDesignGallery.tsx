import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { rememberTemplate, type LibraryTemplate } from '../lib/templateLibrary';
import TemplateLibrary from './TemplateLibrary';
import InvitationToolbar from './invitation/InvitationToolbar';
import { CARDS_PATH } from '../lib/links';

export default function LandingDesignGallery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<LibraryTemplate | null>(null);
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [replay, setReplay] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    setHtml(''); setError('');
    if (!selected) { dialog.current?.close(); return; }
    dialog.current?.showModal();
    let active = true;
    api<{ html: string }>(`/templates/${selected.id}/demo`).then(result => { if (active) setHtml(result.html); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [selected, replay]);
  return <section className="landing-design-gallery" id="bo-suu-tap" aria-labelledby="landing-design-heading">
    <div className="landing-section-heading"><p className="landing-eyebrow">Bộ sưu tập cho mọi dịp vui</p><h2 id="landing-design-heading">Một tấm thiệp, thật đúng với bạn.</h2><p>Từ ngày thành đôi đến sinh nhật, tân gia và những cuộc gặp đáng nhớ. Chọn mẫu bạn yêu thích rồi viết tiếp câu chuyện của mình.</p></div>
    <TemplateLibrary onSelect={setSelected} />
    <dialog className="library-dialog" ref={dialog} onCancel={() => setSelected(null)} onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
      {selected && <><header><h3>{selected.name}</h3><button type="button" autoFocus aria-label="Đóng xem mẫu" onClick={() => setSelected(null)}>✕</button></header><div className="library-dialog-preview invitation-toolbar-host">{html ? <><iframe ref={frame} title={`Xem mẫu ${selected.name}`} sandbox="allow-scripts" srcDoc={html} /><InvitationToolbar frame={frame} key={`${selected.id}-${replay}`} /></> : error ? <p role="alert">{error}</p> : <p role="status">Đang mở thiệp mẫu…</p>}</div><footer><p>Chạm để mở thiệp, cuộn để khám phá nội dung và hiệu ứng.</p><button className="text-button" type="button" onClick={() => setReplay(value => value + 1)}>{error ? 'Thử lại' : 'Xem lại từ đầu'}</button><button className="button" type="button" onClick={() => { rememberTemplate(selected); navigate(user ? CARDS_PATH : '/register'); }}>Dùng mẫu này</button></footer></>}
    </dialog>
  </section>;
}
