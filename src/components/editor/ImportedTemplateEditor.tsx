import { useEffect, useRef, useState } from 'react';
import { api, json } from '../../lib/api';
import { uploadImage } from '../../lib/images';
import { type TemplateField } from '../../lib/templateLibrary';
import type { Wedding } from '../../lib/types';
import TemplateLibrary from '../TemplateLibrary';
import InvitationToolbar from '../invitation/InvitationToolbar';

type Selection = NonNullable<Wedding['importedTemplate']>;
export default function ImportedTemplateEditor({ wedding, change, onEditInfo }: { wedding: Wedding; change: (patch: Partial<Wedding>) => void; onEditInfo?: () => void }) {
  const selected = wedding.importedTemplate;
  const [browse, setBrowse] = useState(!selected);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [active, setActive] = useState('');
  const [filter, setFilter] = useState('');
  const [html, setHtml] = useState('');
  const [boundValues, setBoundValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [history, setHistory] = useState<Selection[]>([]);
  const [future, setFuture] = useState<Selection[]>([]);
  const frame = useRef<HTMLIFrameElement>(null);
  const revision = useRef(0);
  const position = useRef({ top: 0, inner: 0 });
  const latest = useRef(selected); latest.current = selected;
  const selectedId = selected?.templateId;
  useEffect(() => {
    setFields([]); setActive(''); setHtml(''); setBoundValues({}); setHistory([]); setFuture([]); position.current = { top: 0, inner: 0 };
    if (!selectedId) return;
    let live = true;
    api<TemplateField[]>(`/templates/${selectedId}/fields`, {}, true).then(result => { if (live) { setFields(result); setActive(result.find(field => field.type === 'text')?.key || result[0]?.key || ''); } }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [selectedId]);
  // Debounce edits and ignore obsolete responses when switching template or typing quickly.
  useEffect(() => {
    const version = ++revision.current;
    if (!selected) return;
    const timer = setTimeout(() => {
      setPreviewBusy(true);
      const content = { couple: wedding.couple, eventDate: wedding.eventDate, eventTime: wedding.eventTime, dateText: wedding.dateText, venue: wedding.venue };
      api<{ html: string; boundValues: Record<string, string> }>(`/weddings/${wedding.id}/template-preview`, json('POST', { ...selected, content }), true).then(result => {
        if (version === revision.current) { setHtml(result.html); setBoundValues(result.boundValues); setError(''); }
      }).catch(e => { if (version === revision.current) setError(e.message); }).finally(() => { if (version === revision.current) setPreviewBusy(false); });
    }, 600);
    return () => { clearTimeout(timer); revision.current++; };
  }, [selected, wedding]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && event.data?.type === 'ht:scroll') { position.current = { top: Number(event.data.top) || 0, inner: Number(event.data.inner) || 0 }; return; }
      if (event.source !== frame.current?.contentWindow || event.data?.type !== 'ht:field' || !Array.isArray(event.data.keys)) return;
      const key = event.data.keys.find((key: unknown) => fields.some(field => field.key === key));
      if (key) { setActive(key); setFilter(''); }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [fields]);
  function update(next: Selection) {
    if (selected) setHistory(old => [...old.slice(-29), selected]);
    setFuture([]); change({ importedTemplate: next });
  }
  function setValue(key: string, value?: string) {
    if (!selected) return;
    const values = { ...selected.values };
    if (value === undefined) delete values[key]; else values[key] = value;
    update({ ...selected, values });
  }
  const field = fields.find(field => field.key === active);
  return <section className="imported-studio">
    <div className="studio-heading"><div><p className="landing-eyebrow">Không gian sáng tạo</p><h2>Mẫu thiệp của bạn</h2><p>Chạm vào chữ hoặc ảnh trong thiệp để chọn phần cần sửa. Dùng {'{khach}'} để hiện tên người nhận.</p></div><button type="button" className="button-outline" onClick={() => setBrowse(!browse)}>{browse ? 'Đóng bộ sưu tập' : 'Đổi mẫu'}</button></div>
    {browse && <TemplateLibrary selectedId={selectedId} initialCategory={wedding.invitationKind} onSelect={item => {
      if (selected && item.id !== selectedId && Object.keys(selected.values).length && !window.confirm('Đổi mẫu sẽ thay nội dung đang sửa trong mẫu hiện tại. Tiếp tục?')) return;
      if (item.id !== selectedId) change({ invitationKind: item.category, importedTemplate: { templateId: item.id, values: {}, opening: true, motion: true } });
      setBrowse(false);
    }} />}
    {error && <p className="error" role="alert">{error}</p>}
    {selected && <>
      <div className="studio-toolbar"><label><input type="checkbox" checked={selected.opening} onChange={e => update({ ...selected, opening: e.target.checked })} /> Hiệu ứng mở thiệp</label><label><input type="checkbox" checked={selected.motion} onChange={e => update({ ...selected, motion: e.target.checked })} /> Chuyển động</label>
        <button type="button" disabled={!history.length} onClick={() => { const previous = history.at(-1)!; setHistory(h => h.slice(0, -1)); setFuture(f => [...f, selected]); change({ importedTemplate: previous }); }}>Hoàn tác</button>
        <button type="button" disabled={!future.length} onClick={() => { const next = future.at(-1)!; setFuture(f => f.slice(0, -1)); setHistory(h => [...h, selected]); change({ importedTemplate: next }); }}>Làm lại</button>
      </div>
      <div className="studio-workspace">
        <div className="studio-fields">
          <label>Tìm chữ hoặc ảnh<input type="search" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Nhập nội dung cần tìm…" /></label>
          <label>Phần đang chỉnh sửa<select value={active} onChange={e => setActive(e.target.value)}><option value="">Chọn phần nội dung</option>{fields.filter(f => f.label.toLocaleLowerCase().includes(filter.toLocaleLowerCase()) || f.key === active).map(f => <option key={f.key} value={f.key}>{f.type === 'image' ? '▧ ' : 'T '}{f.label}</option>)}</select></label>
          {field && <div className="studio-field" key={field.key}><label>{field.type === 'image' ? 'Đường dẫn ảnh HTTPS' : 'Nội dung'}{field.type === 'text' ? <textarea rows={5} maxLength={5000} readOnly={Boolean(field.binding)} value={boundValues[field.key] ?? selected.values[field.key] ?? field.value} onChange={e => setValue(field.key, e.target.value)} /> : <input type="url" value={selected.values[field.key] || ''} placeholder="Giữ ảnh gốc hoặc dán đường dẫn ảnh mới" onChange={e => setValue(field.key, e.target.value)} />}</label>
            {field.binding && <p>Đồng bộ từ {field.binding.label}. <button type="button" className="text-button" onClick={onEditInfo}>Chỉnh trong Thông tin</button></p>}
            {field.type === 'image' && <label>Tải ảnh của bạn<input type="file" accept="image/*" disabled={busy} onChange={async e => { const file = e.target.files?.[0]; if (!file) return; const key = field.key; const templateId = selected.templateId; setBusy(true); setError(''); try { const url = await uploadImage(file); const current = latest.current; if (current?.templateId === templateId) update({ ...current, values: { ...current.values, [key]: url } }); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }} /></label>}
            {!field.binding && <button type="button" className="text-button" onClick={() => setValue(field.key)}>Khôi phục phần này về mẫu gốc</button>}
            {busy && <p role="status">Đang tải ảnh…</p>}
          </div>}
          <p className="studio-tip">Thay ảnh giữ nguyên khung của mẫu. Bạn có thể sửa lời mời, tên, ngày, địa chỉ và các đoạn nội dung trong bộ chọn phía trên.</p>
          <button type="button" className="text-button" onClick={() => { if (window.confirm('Trở lại giao diện gốc của Hỷ Thiệp? Nội dung đang sửa trong mẫu sẽ được bỏ.')) change({ importedTemplate: null }); }}>Dùng giao diện Hỷ Thiệp nguyên bản</button>
        </div>
        <div className="studio-preview"><p aria-live="polite">{previewBusy ? 'Đang cập nhật bản nháp…' : 'Xem trước bản nháp · Điện thoại'}</p>{html ? <div className="invitation-toolbar-host"><iframe ref={frame} title="Chỉnh sửa trực tiếp mẫu thiệp" sandbox="allow-scripts" srcDoc={html} onLoad={() => frame.current?.contentWindow?.postMessage({ type: 'ht:restore', ...position.current }, '*')} /><InvitationToolbar frame={frame} key={selectedId} wedding={wedding} /></div> : <p>Đang mở mẫu…</p>}<small>Lưu thay đổi để cập nhật thiệp gửi cho khách.</small></div>
      </div>
    </>}
  </section>;
}
