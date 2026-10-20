import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, json } from '../lib/api';
import type { Wedding } from '../lib/types';
import { InfoTab } from '../components/editor/Fields';
import ImagesTab from '../components/editor/ImagesTab';
import ContentTab from '../components/editor/ContentTab';
import SectionsTab from '../components/editor/SectionsTab';
import GuestsTab from '../components/editor/GuestsTab';
import PhotosTab from '../components/editor/PhotosTab';
type Tab = 'info' | 'images' | 'content' | 'sections' | 'guests' | 'photos';
const tabs: { key: Tab; label: string }[] = [{ key: 'info', label: 'Thông tin' }, { key: 'images', label: 'Ảnh' }, { key: 'content', label: 'Nội dung' }, { key: 'sections', label: 'Hạng mục' }, { key: 'guests', label: 'Khách mời' }, { key: 'photos', label: 'Ảnh khách gửi' }];
export default function Editor() { const { id = '' } = useParams(); const navigate = useNavigate(); const [saved, setSaved] = useState<Wedding | null>(null); const [draft, setDraft] = useState<Wedding | null>(null); const [tab, setTab] = useState<Tab>('info'); const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { api<Wedding>(`/weddings/${id}`, {}, true).then(w => { setSaved(w); setDraft(w); }).catch(e => setMessage(e.message)); }, [id]);
  const changes = useMemo(() => { if (!saved || !draft) return {} as Partial<Wedding>; const changed: Partial<Wedding> = {}; for (const key of Object.keys(draft) as (keyof Wedding)[]) if (JSON.stringify(draft[key]) !== JSON.stringify(saved[key])) Object.assign(changed, { [key]: draft[key] }); return changed; }, [saved, draft]); const dirty = Object.keys(changes).length > 0;
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; const guardBack = () => { if (dirty && !window.confirm('Bạn có thay đổi chưa lưu. Rời trang?')) window.history.go(1); }; window.addEventListener('beforeunload', warn); window.addEventListener('popstate', guardBack); return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener('popstate', guardBack); }; }, [dirty]);
  const change = (patch: Partial<Wedding>) => setDraft(w => w ? { ...w, ...patch } : w);
  async function save() { if (!dirty) return; setSaving(true); setMessage(''); try { const result = await api<Wedding>(`/weddings/${id}`, json('PUT', changes), true); setSaved(result); setDraft(result); setMessage('Đã lưu thay đổi.'); } catch (e) { setMessage((e as Error).message); } finally { setSaving(false); } }
  function back() { if (!dirty || window.confirm('Bạn có thay đổi chưa lưu. Rời trang?')) navigate('/dashboard'); }
  if (!draft) return <main className="shell"><p>{message || 'Đang tải thiệp...'}</p><Link to="/dashboard">Về danh sách</Link></main>;
  return <main className="editor"><header className="dash-header"><button className="text-button" onClick={back}>← Thiệp của tôi</button><strong>{draft.couple.groom} & {draft.couple.bride}</strong><a href={`/w/${draft.slug}`} target="_blank" rel="noreferrer">Xem thiệp ↗</a></header><div className="shell"><div className="editor-title"><div><span className="eyebrow">Chỉnh sửa thiệp</span><h1>{draft.couple.groom} & {draft.couple.bride}</h1><p>/w/{draft.slug}</p></div><button className="button" disabled={!dirty || saving} onClick={() => void save()}>{saving ? 'Đang lưu...' : dirty ? 'Lưu thay đổi' : 'Đã lưu'}</button></div>{message && <p role="status" className="notice">{message}</p>}<nav className="tab-nav" aria-label="Chỉnh sửa thiệp">{tabs.map(item => <button key={item.key} className={tab === item.key ? 'active' : ''} onClick={() => setTab(item.key)}>{item.label}</button>)}</nav><div className="editor-panel">{tab === 'info' && <InfoTab wedding={draft} change={change} />}{tab === 'images' && <ImagesTab wedding={draft} change={change} />}{tab === 'content' && <ContentTab wedding={draft} change={change} />}{tab === 'sections' && <SectionsTab wedding={draft} change={change} />}{tab === 'guests' && <GuestsTab weddingId={draft.id} slug={draft.slug} />}{tab === 'photos' && <PhotosTab weddingId={draft.id} slug={draft.slug} />}</div></div></main>;
}

