import { useEffect, useState, type FormEvent } from 'react';
import { api, json } from '../../lib/api';
import { uploadImage } from '../../lib/images';
import type { Photo } from '../../lib/types';
import Picture from './Photo';
export default function PhotoWall({ slug, defaultAuthor }: { slug: string; defaultAuthor?: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]); const [url, setUrl] = useState(''); const [caption, setCaption] = useState(''); const [author, setAuthor] = useState(defaultAuthor || ''); const [progress, setProgress] = useState(0); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { api<Photo[]>(`/public/weddings/${encodeURIComponent(slug)}/photos`).then(setPhotos).catch(() => {}); }, [slug]);
  async function fileChange(file?: File) { if (!file) return; setError(''); setBusy(true); try { setUrl(await uploadImage(file, setProgress)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); if (!/^https:\/\//.test(url)) { setError('Vui lòng chọn ảnh hoặc nhập liên kết HTTPS.'); return; } setBusy(true); try { const saved = await api<Photo>(`/public/weddings/${encodeURIComponent(slug)}/photos`, json('POST', { url, caption, author })); setPhotos(current => [saved, ...current]); setUrl(''); setCaption(''); } catch (err) { setError((err as Error).message); } finally { setBusy(false); } }
  return <section className="invite-section white-section" id="photoWall"><span className="eyebrow">Khoảnh khắc chung</span><h2>Ảnh khách gửi</h2><div className="photo-wall">{photos.map(photo => <figure key={photo.id}><Picture src={photo.url} alt={photo.caption || 'Khoảnh khắc ngày cưới'} /><figcaption><strong>{photo.author}</strong> {photo.caption}</figcaption></figure>)}</div><form className="invite-form" onSubmit={submit}><h3>Chia sẻ khoảnh khắc</h3><label>Chọn ảnh<input type="file" accept="image/*" onChange={e => void fileChange(e.target.files?.[0])} /></label>{busy && progress > 0 && <progress max="100" value={progress} /> }<label>Hoặc dán liên kết ảnh<input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></label><label>Tên của bạn<input value={author} onChange={e => setAuthor(e.target.value)} /></label><label>Lời nhắn<input value={caption} onChange={e => setCaption(e.target.value)} /></label>{error && <p role="alert" className="error">{error}</p>}<button className="button" disabled={busy}>Gửi ảnh</button></form></section>;
}

