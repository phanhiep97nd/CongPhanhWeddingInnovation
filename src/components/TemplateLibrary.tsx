import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { invitationKinds, type LibraryTemplate } from '../lib/templateLibrary';

export default function TemplateLibrary({ onSelect, selectedId, initialCategory = 'all' }: { onSelect: (item: LibraryTemplate) => void; selectedId?: string; initialCategory?: string }) {
  const [items, setItems] = useState<LibraryTemplate[]>([]);
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(12);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    api<LibraryTemplate[]>('/templates', { cache: 'no-cache' }).then(data => { if (active) setItems(data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);
  const filtered = useMemo(() => {
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
    return items.filter(item => (category === 'all' || item.category === category) && normalize(item.name).includes(normalize(query)));
  }, [items, query, category]);
  return <div className="template-library">
    <div className="library-controls"><label className="library-search">Tìm mẫu thiệp<input type="search" placeholder="Hoa hồng, tối giản, sinh nhật…" value={query} onChange={e => { setQuery(e.target.value); setLimit(12); }} /></label><span aria-live="polite">{loading ? 'Đang tải bộ sưu tập…' : `${filtered.length} mẫu dành cho bạn`}</span></div>
    <div className="library-categories" role="group" aria-label="Danh mục thiệp">{[{ id: 'all', label: 'Tất cả' }, ...invitationKinds].map(kind => <button key={kind.id} type="button" aria-pressed={category === kind.id} onClick={() => { setCategory(kind.id); setLimit(12); }}>{kind.label}<small>{kind.id === 'all' ? items.length : items.filter(item => item.category === kind.id).length}</small></button>)}</div>
    {error && <p role="alert">{error} <button type="button" onClick={() => setRetry(n => n + 1)}>Thử lại</button></p>}
    <div className="library-grid">{filtered.slice(0, limit).map(item => <article className="library-card" key={item.id}>
      <button type="button" className="library-image" onClick={() => onSelect(item)} aria-label={`Chọn mẫu ${item.name}`} aria-pressed={selectedId === item.id}><img src={item.thumbnail} alt={item.name} loading="lazy" width="480" height="640" /><span>{selectedId === item.id ? 'Đang chọn' : 'Khám phá mẫu'}</span></button>
      <small>{invitationKinds.find(k => k.id === item.category)?.label}</small><h3>{item.name}</h3><button className="text-button" type="button" onClick={() => onSelect(item)}>{selectedId === item.id ? 'Tiếp tục chỉnh sửa' : 'Dùng mẫu này'} ↗</button>
    </article>)}</div>
    {!loading && !error && !filtered.length && <p>Chưa có mẫu phù hợp. Thử từ khóa hoặc danh mục khác.</p>}
    {filtered.length > limit && <button type="button" className="button-outline library-more" onClick={() => setLimit(n => n + 12)}>Xem thêm mẫu ({filtered.length - limit})</button>}
  </div>;
}
