import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ChevronLeft, Check, ChevronRight, ImageIcon, Images, Link2, List, Mail, Play, MousePointerClick, Redo2, RotateCcw, Search, Type, Undo2, Upload, UserRound, X } from 'lucide-react';
import { api, json } from '../../lib/api';
import { uploadImage } from '../../lib/images';
import { type TemplateBindingSource, type TemplateField } from '../../lib/templateLibrary';
import type { EnvelopeTexts, Wedding } from '../../lib/types';
import TemplateLibrary from '../TemplateLibrary';
import DateInput from './DateInput';
import MapField from './MapField';
import { parseMapInput } from '../../lib/mapInput';
import InvitationToolbar from '../invitation/InvitationToolbar';

type Selection = NonNullable<Wedding['importedTemplate']>;
type Kind = 'all' | 'text' | 'image' | 'edited';
type Rendered = { templateId: string; opening: boolean; motion: boolean; content: string; envelope: string; album: string; values: Selection['values'] };
// The shared opening envelope is edited like a part of the card, under this pseudo key.
const ENVELOPE = '__envelope';
const envelopeParts: { key: keyof EnvelopeTexts; label: string; placeholder: string }[] = [
  { key: 'kicker', label: 'Lời mời phía trên', placeholder: 'Trân trọng kính mời' },
  { key: 'to', label: 'Lời gửi trên phong bì', placeholder: 'Kính gửi' },
  { key: 'letter', label: 'Chữ trên lá thư', placeholder: 'Thiệp mời' },
  { key: 'button', label: 'Chữ trên nút mở', placeholder: 'Mở thiệp' },
];
const kinds: { id: Kind; label: string }[] = [{ id: 'all', label: 'Tất cả' }, { id: 'text', label: 'Chữ' }, { id: 'image', label: 'Ảnh' }, { id: 'edited', label: 'Đã sửa' }];
const mobile = () => typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 600px)').matches;
type Change = (patch: Partial<Wedding>) => void;
// Synchronized parts of a template edit the invitation information itself, so the card and guest pages never disagree.
function InfoFields({ source, wedding: w, change, first }: { source: TemplateBindingSource; wedding: Wedding; change: Change; first: RefObject<HTMLInputElement | null> }) {
  const couple = w.couple, venue = w.venue;
  // Short names feed the couple line and initials; full names feed family sections.
  if (source === 'names') return <div className="studio-info studio-info-row">
    <label>Tên chú rể<input ref={first} value={couple.groom} onChange={e => change({ couple: { ...couple, groom: e.target.value } })} /></label>
    <label>Tên cô dâu<input value={couple.bride} onChange={e => change({ couple: { ...couple, bride: e.target.value } })} /></label>
    <label>Họ tên chú rể<input value={couple.groomFull} placeholder={couple.groom} onChange={e => change({ couple: { ...couple, groomFull: e.target.value } })} /></label>
    <label>Họ tên cô dâu<input value={couple.brideFull} placeholder={couple.bride} onChange={e => change({ couple: { ...couple, brideFull: e.target.value } })} /></label>
  </div>;
  if (source === 'schedule') return <div className="studio-info studio-info-row">
    <label>Ngày cưới<DateInput ref={first} value={w.eventDate} onChange={eventDate => change({ eventDate })} /></label>
    <label>Giờ làm lễ<input type="time" value={w.eventTime || ''} onChange={e => change({ eventTime: e.target.value })} /></label>
  </div>;
  if (source === 'dateText') return <div className="studio-info"><label>Ngày hiển thị<input ref={first} value={w.dateText} placeholder="Ví dụ: Tức ngày 18 tháng 4 năm Bính Ngọ" onChange={e => change({ dateText: e.target.value })} /></label></div>;
  return <div className="studio-info">
    <label>Tên địa điểm<input ref={first} value={venue.name} onChange={e => change({ venue: { ...venue, name: e.target.value } })} /></label>
    <label>Địa chỉ<input value={venue.address} onChange={e => change({ venue: { ...venue, address: e.target.value } })} /></label>
    <MapField value={venue.mapUrl} onChange={mapUrl => change({ venue: { ...venue, mapUrl } })} />
  </div>;
}
// Texts with the same content (ignoring case and spacing) are one piece of information edited once.
// Single numbers (calendar cells, countdown digits) are never linked.
const linkKey = (text: string) => { const value = text.normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi'); return value.length < 2 || /^\d{1,2}$/.test(value) ? '' : value; };
const isUpper = (text: string) => /\p{L}/u.test(text) && text === text.toLocaleUpperCase('vi');
const typing = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export default function ImportedTemplateEditor({ wedding, change }: { wedding: Wedding; change: Change }) {
  const selected = wedding.importedTemplate;
  const [browse, setBrowse] = useState(!selected);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [active, setActive] = useState('');
  const [filter, setFilter] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [html, setHtml] = useState('');
  const [boundValues, setBoundValues] = useState<Record<string, string>>({});
  // Text that follows the wedding date until it is edited (date, weekday, time, lunar date).
  const [softValues, setSoftValues] = useState<Record<string, string>>({});
  const softRef = useRef(softValues); softRef.current = softValues;
  const [images, setImages] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [albumProgress, setAlbumProgress] = useState('');
  // Phones edit one part at a time in a popup; the full list stays folded until asked for.
  const [sheet, setSheet] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const popup = useRef<HTMLDialogElement>(null);
  const [history, setHistory] = useState<Selection[]>([]);
  const [future, setFuture] = useState<Selection[]>([]);
  const frame = useRef<HTMLIFrameElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const editorInput = useRef<HTMLTextAreaElement>(null);
  const infoInput = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const position = useRef({ top: 0, inner: 0 });
  const latest = useRef(selected); latest.current = selected;
  const lastEdit = useRef({ key: '', time: 0 });
  const pendingFocus = useRef('');
  // What the current iframe document shows: the last server render plus text patches it acknowledged.
  const rendered = useRef<Rendered | null>(null);
  const live = useRef(new Map<string, string>());
  const previous = useRef<Selection | null | undefined>(undefined);
  // The editor opens straight onto the card so every part can be clicked; the opening animation plays only on request.
  const playOpening = useRef(false);
  const [replay, setReplay] = useState(0);
  const [openingKind, setOpeningKind] = useState<'shared' | 'native' | ''>('');
  const selectedId = selected?.templateId;
  const fieldMap = useMemo(() => new Map(fields.map(field => [field.key, field])), [fields]);
  const fieldsRef = useRef(fieldMap); fieldsRef.current = fieldMap;
  // Copies the owner chose to edit one by one; they stay apart for this session, and apart for good once they differ.
  const [detached, setDetached] = useState<Set<string>>(() => new Set());

  // One row per piece of information, in card order: synchronized groups (e.g. a calendar) and texts that read the
  // same everywhere (e.g. a repeated address) collapse to one row whose first field leads.
  const currentValues = selected?.values;
  const { rows, owner, members } = useMemo(() => {
    const index = new Map<string, number>(order.map((key, at) => [key, at]));
    const owner = new Map<string, string>(), groups = new Map<string, string>(), sameText = new Map<string, string>(), members = new Map<string, string[]>();
    const rows = [...fields].sort((a, b) => (index.get(a.key) ?? Infinity) - (index.get(b.key) ?? Infinity)).filter(field => {
      // The album is one row: the owner uploads its photos together instead of replacing them one by one.
      if (field.album !== undefined) {
        const lead = groups.get('album');
        if (lead) { owner.set(field.key, lead); members.get(lead)!.push(field.key); return false; }
        groups.set('album', field.key); members.set(field.key, [field.key]); owner.set(field.key, field.key);
        return true;
      }
      const group = field.binding?.source;
      if (group && groups.has(group)) { owner.set(field.key, groups.get(group)!); return false; }
      if (group) groups.set(group, field.key);
      else if (field.type === 'text' && !detached.has(field.key)) {
        const text = linkKey(currentValues?.[field.key] ?? softValues[field.key] ?? field.value);
        const lead = text && sameText.get(text);
        if (lead) { owner.set(field.key, lead); members.get(lead)!.push(field.key); return false; }
        if (text) { sameText.set(text, field.key); members.set(field.key, [field.key]); }
      }
      owner.set(field.key, field.key);
      return true;
    });
    return { rows, owner, members };
  }, [fields, order, currentValues, softValues, detached]);
  const ownerRef = useRef(owner); ownerRef.current = owner;
  const membersRef = useRef(members); membersRef.current = members;
  const membersOf = (key: string) => members.get(key) || [key];

  const post = (message: Record<string, unknown>) => frame.current?.contentWindow?.postMessage(message, '*');
  const edited = (field: TemplateField) => Boolean(selected && ((field.album !== undefined && selected.album?.length) || membersOf(field.key).some(key => Object.hasOwn(selected.values, key))));
  // Album positions of this template: the most photos the owner can upload.
  const albumLimit = useMemo(() => fields.reduce((most, field) => field.album === undefined ? most : Math.max(most, field.album + 1), 0), [fields]);
  // Calendar cells have no text of their own to show; the wedding date stands for them.
  const weddingDay = wedding.eventDate ? new Date(wedding.eventDate).toLocaleDateString('vi-VN', { timeZone: 'UTC' }) : '';
  const valueOf = (field: TemplateField) => field.binding ? boundValues[field.key] || (field.binding.source === 'schedule' ? weddingDay : '') : field.type === 'text' ? selected?.values[field.key] ?? softValues[field.key] ?? field.value : field.album !== undefined ? selected?.album?.[0] || images[field.key] || '' : selected?.values[field.key] || images[field.key] || '';

  useEffect(() => {
    setFields([]); setOrder([]); setActive(''); setOpeningKind(''); setDetached(new Set()); setHtml(''); setBoundValues({}); setSoftValues({}); setImages({}); setHistory([]); setFuture([]); setSheet(false);
    position.current = { top: 0, inner: 0 }; rendered.current = null; playOpening.current = false; live.current.clear(); previous.current = undefined;
    if (!selectedId) return;
    let alive = true;
    api<TemplateField[]>(`/templates/${selectedId}/fields`, {}, true).then(result => { if (alive) setFields(result); }).catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [selectedId]);

  // Plain text edits are patched into the open preview immediately; the server render below only runs when needed.
  useEffect(() => {
    const before = previous.current; previous.current = selected;
    if (!selected || !before || before.templateId !== selected.templateId) return;
    for (const field of fieldMap.values()) {
      if (field.type !== 'text' || field.binding) continue;
      const base = softRef.current[field.key] ?? field.value, value = selected.values[field.key] ?? base;
      if (value !== (before.values[field.key] ?? base)) post({ type: 'ht:text', key: field.key, value });
    }
  }, [selected, fieldMap]);

  useEffect(() => {
    const version = ++revision.current;
    if (!selected) return;
    // Field errors belong beside the input, not underneath the template preview.
    // Preserve the last valid preview while the owner is typing an incomplete URL.
    if (!parseMapInput(wedding.venue.mapUrl).ok) { setPreviewBusy(false); return; }
    const content = { couple: wedding.couple, eventDate: wedding.eventDate, eventTime: wedding.eventTime, dateText: wedding.dateText, venue: wedding.venue };
    const contentKey = JSON.stringify(content);
    const timer = setTimeout(() => {
      const shown = rendered.current;
      const envelopeKey = JSON.stringify(selected.envelope || {}), albumKey = JSON.stringify(selected.album || []);
      if (shown && shown.templateId === selected.templateId && shown.opening === selected.opening && shown.motion === selected.motion && shown.content === contentKey && shown.envelope === envelopeKey && shown.album === albumKey) {
        const changed = [...new Set([...Object.keys(shown.values), ...Object.keys(selected.values)])].filter(key => shown.values[key] !== selected.values[key]);
        const patched = changed.every(key => { const field = fieldsRef.current.get(key); return field?.type === 'text' && live.current.get(key) === (selected.values[key] ?? softRef.current[key] ?? field.value); });
        if (patched) { rendered.current = { ...shown, values: selected.values }; return; }
      }
      setPreviewBusy(true);
      api<{ html: string; boundValues: Record<string, string>; softValues?: Record<string, string>; images?: Record<string, string>; opening?: 'shared' | 'native' }>(`/weddings/${wedding.id}/template-preview`, json('POST', { ...selected, content }), true).then(result => {
        if (version !== revision.current) return;
        rendered.current = { templateId: selected.templateId, opening: selected.opening, motion: selected.motion, content: contentKey, envelope: envelopeKey, album: albumKey, values: selected.values };
        live.current.clear();
        setHtml(result.html); setBoundValues(result.boundValues); setSoftValues(result.softValues || {}); setImages(result.images || {}); setOpeningKind(result.opening || ''); setError('');
      }).catch(e => { if (version === revision.current) setError(e.message); }).finally(() => { if (version === revision.current) setPreviewBusy(false); });
    }, 500);
    return () => { clearTimeout(timer); revision.current++; };
  }, [selected, wedding]);

  const activeRef = useRef(active); activeRef.current = active;
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const data = event.data || {};
      if (data.type === 'ht:scroll') position.current = { top: Number(data.top) || 0, inner: Number(data.inner) || 0 };
      else if (data.type === 'ht:ready' && Array.isArray(data.order)) {
        setOrder(data.order.filter((key: unknown): key is string => typeof key === 'string'));
        if (activeRef.current) post({ type: 'ht:select', key: activeRef.current });
      } else if (data.type === 'ht:text-applied') {
        if (data.ok && typeof data.key === 'string' && typeof data.value === 'string') live.current.set(data.key, data.value);
      } else if (data.type === 'ht:envelope') select(ENVELOPE, 'preview');
      else if (data.type === 'ht:field' && Array.isArray(data.keys)) {
        const key = data.keys.map((key: unknown) => typeof key === 'string' ? ownerRef.current.get(key) : undefined).find(Boolean);
        if (key) select(key, 'preview');
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);

  // After a click on the card, bring the matching row into view inside the list (not the whole page) and focus it.
  useEffect(() => {
    if (!pendingFocus.current || pendingFocus.current !== active) return;
    pendingFocus.current = '';
    const row = list.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(active)}"]`);
    if (row && list.current && !sheet) list.current.scrollTo?.({ top: row.offsetTop - list.current.offsetTop - 8, behavior: 'smooth' });
    requestAnimationFrame(() => (editorInput.current || infoInput.current)?.focus({ preventScroll: true }));
  }, [active, sheet]);

  function select(key: string, source: 'list' | 'preview') {
    const field = fieldsRef.current.get(key);
    // Show the envelope while its wording is edited; leave it again when another part is chosen.
    if (key === ENVELOPE && source === 'list') { playOpening.current = true; setReplay(value => value + 1); }
    else if (key !== ENVELOPE && activeRef.current === ENVELOPE) post({ type: 'ht:restore', ...position.current, skipOpening: true });
    setActive(key);
    if (source === 'preview') {
      setFilter('');
      setKind(kind => kind === 'all' || (field && kind === field.type) ? kind : 'all');
      pendingFocus.current = key;
    }
    if (mobile()) { pendingFocus.current = key; setSheet(true); }
    post({ type: 'ht:select', key: key === ENVELOPE ? '' : key, keys: key === ENVELOPE ? [] : membersRef.current.get(key) || [key], scroll: source === 'list' });
  }
  function setEnvelope(part: keyof EnvelopeTexts, value: string) {
    if (!selected) return;
    update({ ...selected, envelope: { ...selected.envelope, [part]: value } }, `envelope:${part}`);
  }
  function update(next: Selection, coalesce = '') {
    const now = Date.now();
    const merge = coalesce && lastEdit.current.key === coalesce && now - lastEdit.current.time < 1500;
    lastEdit.current = { key: coalesce, time: now };
    if (selected && !merge) setHistory(old => [...old.slice(-49), selected]);
    setFuture([]); change({ importedTemplate: next });
  }
  // Writing one copy writes them all; copies shown in capitals stay in capitals.
  function setValue(key: string, value?: string, coalesce = false) {
    if (!selected) return;
    const values = { ...selected.values };
    for (const copy of membersOf(key)) {
      if (value === undefined) { delete values[copy]; continue; }
      const current = selected.values[copy] ?? fieldMap.get(copy)?.value ?? '';
      values[copy] = copy !== key && isUpper(current) ? value.toLocaleUpperCase('vi') : value;
    }
    update({ ...selected, values }, coalesce ? key : '');
  }
  function undo() {
    if (!selected || !history.length) return;
    const previousSelection = history.at(-1)!; lastEdit.current = { key: '', time: 0 };
    setHistory(h => h.slice(0, -1)); setFuture(f => [...f, selected]); change({ importedTemplate: previousSelection });
  }
  function redo() {
    if (!selected || !future.length) return;
    const next = future.at(-1)!; lastEdit.current = { key: '', time: 0 };
    setFuture(f => f.slice(0, -1)); setHistory(h => [...h, selected]); change({ importedTemplate: next });
  }
  useEffect(() => {
    const dialog = popup.current;
    if (!dialog) return;
    // showModal focuses the close button; move focus to the field being edited instead.
    if (sheet && active && !dialog.open) { dialog.showModal?.(); (editorInput.current || infoInput.current)?.focus({ preventScroll: true }); }
    else if ((!sheet || !active) && dialog.open) dialog.close();
  }, [sheet, active]);
  const shortcuts = useRef({ undo, redo }); shortcuts.current = { undo, redo };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || typing(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) { event.preventDefault(); shortcuts.current.undo(); }
      else if (key === 'y' || (key === 'z' && event.shiftKey)) { event.preventDefault(); shortcuts.current.redo(); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);

  const query = filter.trim().toLocaleLowerCase();
  const visible = rows.filter(field => {
    if (kind === 'text' && field.type !== 'text') return false;
    if (kind === 'image' && field.type !== 'image') return false;
    if (kind === 'edited' && !edited(field)) return false;
    return !query || [field.label, field.binding?.label, field.type === 'text' ? valueOf(field) : ''].some(text => text?.toLocaleLowerCase().includes(query));
  });
  const counts: Record<Kind, number> = { all: rows.length, text: rows.filter(f => f.type === 'text').length, image: rows.filter(f => f.type === 'image').length, edited: rows.filter(edited).length };
  const field = fieldMap.get(active);
  const step = (offset: number) => {
    const index = visible.findIndex(row => row.key === active);
    const next = visible[index < 0 ? 0 : index + offset];
    if (next) { pendingFocus.current = next.key; select(next.key, 'list'); }
  };

  function insertGuest() {
    if (!field || !selected) return;
    const input = editorInput.current, value = valueOf(field);
    const start = input?.selectionStart ?? value.length, end = input?.selectionEnd ?? value.length;
    setValue(field.key, `${value.slice(0, start)}{khach}${value.slice(end)}`);
    requestAnimationFrame(() => { if (input) { input.focus(); input.setSelectionRange(start + 7, start + 7); } });
  }
  async function upload(file: File) {
    if (!field || !selected) return;
    const key = field.key, templateId = selected.templateId;
    setBusy(true); setError('');
    try {
      const url = await uploadImage(file);
      const current = latest.current;
      if (current?.templateId === templateId) update({ ...current, values: { ...current.values, [key]: url } });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  // Photos picked together upload in order; the album keeps at most one photo per album position of the template.
  async function uploadAlbum(files: File[]) {
    if (!selected) return;
    const templateId = selected.templateId, room = albumLimit - (selected.album?.length || 0);
    const chosen = files.slice(0, Math.max(0, room));
    setError(files.length > chosen.length ? `Album của mẫu này có ${albumLimit} khung ảnh nên chỉ thêm được ${chosen.length} ảnh.` : '');
    if (!chosen.length) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const [index, file] of chosen.entries()) { setAlbumProgress(`${index + 1}/${chosen.length}`); urls.push(await uploadImage(file)); }
      const current = latest.current;
      if (current?.templateId === templateId) setAlbum(current, [...(current.album || []), ...urls]);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); setAlbumProgress(''); }
  }
  // Older cards replaced album photos one by one; once the album is set, those single edits give way to it.
  function setAlbum(current: Selection, album: string[]) {
    const values = Object.fromEntries(Object.entries(current.values).filter(([key]) => fieldMap.get(key)?.album === undefined));
    update({ ...current, values, album });
  }
  const move = (album: string[], from: number, to: number) => { const next = [...album]; [next[from], next[to]] = [next[to], next[from]]; return next; };
  const albumEditor = (lead: TemplateField) => {
    if (!selected) return null;
    const album = selected.album || [];
    return <>
      <p className="studio-hint"><Images size={13} aria-hidden="true" /> Album của mẫu này có {albumLimit} khung ảnh. Chọn nhiều ảnh cùng lúc; ảnh được xếp vào các khung theo thứ tự và lặp lại khi bạn có ít ảnh hơn số khung.</p>
      {album.length > 0 ? <ol className="studio-album" aria-label="Ảnh trong album">{album.map((photo, index) => <li key={`${index}-${photo}`}>
        <img src={photo} alt={`Ảnh ${index + 1}`} />
        <span>{index + 1}</span>
        <div className="studio-album-actions">
          <button type="button" aria-label={`Đưa ảnh ${index + 1} lên trước`} disabled={index === 0} onClick={() => setAlbum(selected, move(album, index, index - 1))}><ChevronLeft size={14} aria-hidden="true" /></button>
          <button type="button" aria-label={`Bỏ ảnh ${index + 1}`} onClick={() => setAlbum(selected, album.filter((_, at) => at !== index))}><X size={14} aria-hidden="true" /></button>
          <button type="button" aria-label={`Đưa ảnh ${index + 1} ra sau`} disabled={index === album.length - 1} onClick={() => setAlbum(selected, move(album, index, index + 1))}><ChevronRight size={14} aria-hidden="true" /></button>
        </div>
      </li>)}</ol> : <div className="studio-image">{valueOf(lead) ? <img src={valueOf(lead)} alt="" /> : <ImageIcon size={32} aria-hidden="true" />}</div>}
      <div className="studio-editor-actions">
        <label className={`button studio-upload${busy || album.length >= albumLimit ? ' is-busy' : ''}`}><Upload size={16} aria-hidden="true" /> {busy ? `Đang tải ảnh ${albumProgress}…` : album.length >= albumLimit ? 'Album đã đủ ảnh' : album.length ? 'Thêm ảnh' : 'Tải ảnh album'}<input type="file" accept="image/*" multiple disabled={busy || album.length >= albumLimit} onChange={e => { const files = [...(e.target.files || [])]; e.target.value = ''; if (files.length) void uploadAlbum(files); }} /></label>
        <span className="studio-count">{album.length}/{albumLimit} ảnh</span>
        {album.length > 0 && <button type="button" className="studio-chip" onClick={() => setAlbum(selected, [])}><RotateCcw size={15} aria-hidden="true" /> Về ảnh mẫu</button>}
      </div>
    </>;
  };
  const envelopeEditor = selected && <div className="studio-editor" key={ENVELOPE}>
    {!selected.opening && <p className="studio-hint">Hiệu ứng mở thiệp đang tắt nên khách sẽ không thấy phong thư. <button type="button" className="text-button" onClick={() => update({ ...selected, opening: true })}>Bật lại</button></p>}
    <div className="studio-info">{envelopeParts.map((part, index) => <label key={part.key}>{part.label}<input ref={index === 0 ? infoInput : undefined} maxLength={120} value={selected.envelope?.[part.key] || ''} placeholder={part.placeholder} onChange={e => setEnvelope(part.key, e.target.value)} /></label>)}</div>
    <p className="studio-hint"><Link2 size={13} aria-hidden="true" /> Tên khách, tên cô dâu chú rể và ngày cưới được điền tự động từ thông tin thiệp. Màu và phông chữ lấy theo mẫu.</p>
    <button type="button" className="studio-chip" onClick={() => { playOpening.current = true; setReplay(value => value + 1); }}><Play size={14} aria-hidden="true" /> Xem lại phong thư</button>
  </div>;
  const stepIndex = visible.findIndex(row => row.key === active);
  const editor = active === ENVELOPE ? envelopeEditor : field && selected && <div className="studio-editor" key={field.key}>
    {field.binding ? <>
      <InfoFields source={field.binding.source} wedding={wedding} change={change} first={infoInput} />
      <p className="studio-hint"><Link2 size={13} aria-hidden="true" /> Đồng bộ với thông tin thiệp: lịch, đếm ngược và trang khách dùng cùng dữ liệu này.</p>
    </> : field.album !== undefined ? albumEditor(field) : field.type === 'text' ? <>
      <label htmlFor={`studio-${field.key}`} className="sr-only">Nội dung</label>
      <textarea id={`studio-${field.key}`} ref={editorInput} rows={Math.min(8, Math.max(2, valueOf(field).split('\n').length + 1))} maxLength={5000} value={valueOf(field)} onChange={e => setValue(field.key, e.target.value, true)} />
      {membersOf(field.key).length > 1 && <p className="studio-hint"><Link2 size={13} aria-hidden="true" /> Sửa một lần cho cả {membersOf(field.key).length} chỗ có cùng nội dung trên thiệp. <button type="button" className="text-button" onClick={() => setDetached(old => new Set([...old, ...membersOf(field.key)]))}>Tách để sửa riêng</button></p>}
      <div className="studio-editor-actions">
        <button type="button" className="studio-chip" onClick={insertGuest} title="Tên từng khách sẽ hiện ở vị trí này"><UserRound size={15} aria-hidden="true" /> Chèn tên khách</button>
        {edited(field) && <button type="button" className="studio-chip" onClick={() => setValue(field.key)}><RotateCcw size={15} aria-hidden="true" /> {Object.hasOwn(softValues, field.key) ? 'Theo ngày cưới' : 'Về chữ gốc'}</button>}
      </div>
      {Object.hasOwn(softValues, field.key) && <p className="studio-hint"><Link2 size={13} aria-hidden="true" /> {edited(field) ? 'Bạn đã sửa tay phần này nên nó không đổi theo ngày cưới nữa.' : 'Phần này tự theo ngày cưới trong thông tin thiệp (gồm thứ, giờ và ngày âm lịch). Bạn vẫn có thể sửa.'}</p>}
    </> : <>
      <div className="studio-image">{valueOf(field) ? <img src={valueOf(field)} alt="" /> : <ImageIcon size={32} aria-hidden="true" />}</div>
      <div className="studio-editor-actions">
        <label className={`button studio-upload${busy ? ' is-busy' : ''}`}><Upload size={16} aria-hidden="true" /> {busy ? 'Đang tải ảnh…' : 'Tải ảnh của bạn'}<input type="file" accept="image/*" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void upload(file); }} /></label>
        {edited(field) && <button type="button" className="studio-chip" onClick={() => setValue(field.key)}><RotateCcw size={15} aria-hidden="true" /> Về ảnh gốc</button>}
      </div>
      <details className="studio-url"><summary>Hoặc dán đường dẫn ảnh (HTTPS)</summary><input type="url" aria-label="Đường dẫn ảnh HTTPS" value={selected.values[field.key] || ''} placeholder="https://…" onChange={e => setValue(field.key, e.target.value, true)} /></details>
      <p className="studio-hint">Ảnh mới được đặt vừa khung của mẫu.</p>
    </>}
    <div className="studio-stepper">
      <button type="button" onClick={() => step(-1)} disabled={stepIndex <= 0}><ChevronLeft size={16} aria-hidden="true" /> Phần trước</button>
      <span>{stepIndex >= 0 ? `${stepIndex + 1} / ${visible.length}` : ''}</span>
      <button type="button" onClick={() => step(1)} disabled={stepIndex < 0 || stepIndex >= visible.length - 1}>Phần tiếp <ChevronRight size={16} aria-hidden="true" /></button>
    </div>
  </div>;

  return <section className="imported-studio">
    <div className="studio-heading"><div><p className="landing-eyebrow">Không gian sáng tạo</p>{selected ? <h2>Mẫu thiệp của bạn</h2> : <><h2>Bộ sưu tập mẫu</h2><p>Chọn một mẫu, sau đó sửa chữ và ảnh trực tiếp trên thiệp.</p></>}</div><button type="button" className="button-outline" onClick={() => setBrowse(!browse)}>{browse ? 'Đóng bộ sưu tập' : selected ? 'Đổi mẫu' : 'Xem bộ sưu tập'}</button></div>
    {browse && <TemplateLibrary selectedId={selectedId} initialCategory={wedding.invitationKind} onSelect={item => {
      if (selected && item.id !== selectedId && Object.keys(selected.values).length && !window.confirm('Đổi mẫu sẽ thay nội dung đang sửa trong mẫu hiện tại. Tiếp tục?')) return;
      if (item.id !== selectedId) change({ invitationKind: item.category, importedTemplate: { templateId: item.id, values: {}, opening: true, motion: true } });
      setBrowse(false);
    }} />}
    {error && <p className="error" role="alert">{error}</p>}
    {selected && <>
      <div className="studio-toolbar">
        <div className="studio-history" role="group" aria-label="Lịch sử chỉnh sửa">
          <button type="button" disabled={!history.length} onClick={undo} title="Hoàn tác (Ctrl+Z)"><Undo2 size={16} aria-hidden="true" /> Hoàn tác</button>
          <button type="button" disabled={!future.length} onClick={redo} title="Làm lại (Ctrl+Y)"><Redo2 size={16} aria-hidden="true" /> Làm lại</button>
        </div>
        <label><input type="checkbox" checked={selected.opening} onChange={e => update({ ...selected, opening: e.target.checked })} /> Hiệu ứng mở thiệp</label>
        <label><input type="checkbox" checked={selected.motion} onChange={e => update({ ...selected, motion: e.target.checked })} /> Chuyển động</label>
        <label><input type="checkbox" checked={wedding.theme.blessings !== false} onChange={e => change({ theme: { ...wedding.theme, blessings: e.target.checked } })} /> Lời chúc tự chạy</label>
        {counts.edited > 0 && <span className="studio-count">Đã sửa {counts.edited} phần</span>}
      </div>
      <div className="studio-workspace">
        <div className="studio-fields">
          <button type="button" className="studio-list-toggle" aria-expanded={listOpen} onClick={() => setListOpen(open => !open)}><List size={16} aria-hidden="true" /> {listOpen ? 'Ẩn danh sách các phần' : `Xem danh sách tất cả các phần (${rows.length})`}</button>
          <div className={`studio-browser${listOpen ? ' is-open' : ''}`}>
          <div className="studio-search"><Search size={16} aria-hidden="true" /><input type="search" aria-label="Tìm chữ hoặc ảnh" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Tìm nội dung trên thiệp…" /></div>
          <div className="studio-kinds" role="group" aria-label="Lọc phần nội dung">{kinds.map(item => <button type="button" key={item.id} aria-pressed={kind === item.id} onClick={() => setKind(item.id)}>{item.label} <span>{counts[item.id]}</span></button>)}</div>
          {!field && active !== ENVELOPE && <p className="studio-empty"><MousePointerClick size={20} aria-hidden="true" /> Bấm vào chữ hoặc ảnh trên thiệp, hoặc chọn một phần trong danh sách dưới đây để bắt đầu.</p>}
          <ol ref={list} className="studio-list" aria-label="Các phần có thể chỉnh sửa">
            {openingKind === 'shared' && !query && kind === 'all' && <li data-key={ENVELOPE} className={active === ENVELOPE ? 'is-active' : undefined}>
              <button type="button" className="studio-row" aria-expanded={active === ENVELOPE} onClick={() => select(ENVELOPE, 'list')}>
                <span className="studio-row-icon" aria-hidden="true"><Mail size={16} /></span>
                <span className="studio-row-text"><strong>Phong thư mở đầu</strong><small>{selected.opening ? 'Lời mời và tên khách trước khi mở thiệp' : 'Đang tắt hiệu ứng mở thiệp'}</small></span>
                {selected.envelope && <span className="studio-dot" aria-label="Đã sửa" />}
              </button>
              {active === ENVELOPE && !sheet && editor}
            </li>}
            {!fields.length && <li className="studio-list-note">Đang tải các phần của mẫu…</li>}
            {fields.length > 0 && !visible.length && <li className="studio-list-note">Không có phần nào khớp.</li>}
            {visible.map(row => {
              const isActive = row.key === active, value = valueOf(row);
              const title = row.binding ? row.binding.label : row.album !== undefined ? 'Album ảnh' : row.type === 'text' ? value.trim() || '(Để trống)' : row.label;
              const copies = membersOf(row.key).length;
              const note = row.binding ? value.trim() || 'Chưa nhập' : row.album !== undefined ? (selected.album?.length ? `${selected.album.length}/${albumLimit} ảnh của bạn` : `Ảnh mẫu · tối đa ${albumLimit} ảnh`) : row.type === 'image' ? (edited(row) ? 'Ảnh của bạn' : 'Ảnh mẫu') : [copies > 1 ? `Giống nhau ở ${copies} chỗ` : 'Chữ', edited(row) ? 'Đã sửa' : Object.hasOwn(softValues, row.key) ? 'Theo ngày cưới' : ''].filter(Boolean).join(' · ');
              return <li key={row.key} data-key={row.key} className={isActive ? 'is-active' : undefined}>
                <button type="button" className="studio-row" aria-expanded={isActive} onClick={() => select(row.key, 'list')} onMouseEnter={() => post({ type: 'ht:hover', keys: membersOf(row.key) })} onMouseLeave={() => post({ type: 'ht:hover', key: '' })} onFocus={() => post({ type: 'ht:hover', keys: membersOf(row.key) })} onBlur={() => post({ type: 'ht:hover', key: '' })}>
                  <span className="studio-row-icon" aria-hidden="true">{row.type === 'image' ? value ? <img src={value} alt="" loading="lazy" /> : <ImageIcon size={16} /> : row.binding ? <Link2 size={15} /> : <Type size={16} />}</span>
                  <span className="studio-row-text"><strong>{title}</strong><small>{note}</small></span>
                  {edited(row) && <span className="studio-dot" aria-label="Đã sửa" />}
                </button>
                {isActive && !sheet && editor}
              </li>;
            })}
          </ol>
          </div>
          <button type="button" className="text-button studio-reset" onClick={() => { if (window.confirm('Trở lại giao diện gốc của Hỷ Thiệp? Nội dung đang sửa trong mẫu sẽ được bỏ.')) change({ importedTemplate: null }); }}>Dùng giao diện Hỷ Thiệp nguyên bản</button>
        </div>
        <div className="studio-preview">
          {previewBusy && <p aria-live="polite" className="is-busy">Đang cập nhật bản nháp…</p>}
          {html ? <div className="invitation-toolbar-host"><iframe key={replay} ref={frame} title="Chỉnh sửa trực tiếp mẫu thiệp" sandbox="allow-scripts" srcDoc={html} onLoad={() => { post({ type: 'ht:restore', ...position.current, skipOpening: !playOpening.current && activeRef.current !== ENVELOPE }); playOpening.current = false; }} /><InvitationToolbar frame={frame} key={`${selectedId}-${replay}`} wedding={wedding} /></div> : <p>Đang mở mẫu…</p>}
          {selected.opening && html && <button type="button" className="studio-chip studio-replay" onClick={() => { playOpening.current = true; position.current = { top: 0, inner: 0 }; setReplay(value => value + 1); }}><Play size={14} aria-hidden="true" /> Xem hiệu ứng mở thiệp</button>}
          <small>Nhớ bấm “Lưu thay đổi” để cập nhật thiệp gửi cho khách.</small>
        </div>
      </div>
      <dialog ref={popup} className="studio-popup" aria-label="Chỉnh sửa phần đã chọn" onClose={() => setSheet(false)} onClick={event => { if (event.target === event.currentTarget) setSheet(false); }}>
        {sheet && (field || active === ENVELOPE) && <>
          <div className="studio-popup-head"><span className="studio-row-icon" aria-hidden="true">{!field ? <Mail size={16} /> : field.album !== undefined ? <Images size={16} /> : field.type === 'image' ? <ImageIcon size={16} /> : field.binding ? <Link2 size={15} /> : <Type size={16} />}</span><strong>{!field ? 'Phong thư mở đầu' : field.binding ? field.binding.label : field.album !== undefined ? 'Album ảnh' : field.type === 'image' ? field.label : 'Sửa chữ'}</strong><button type="button" aria-label="Đóng" onClick={() => setSheet(false)}><X size={18} /></button></div>
          {editor}
          <button type="button" className="button studio-popup-done" onClick={() => setSheet(false)}><Check size={16} aria-hidden="true" /> Xong</button>
        </>}
      </dialog>
    </>}
  </section>;
}
