import type { Wedding } from "../../lib/types";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { uploadAudio } from "../../lib/images";
import LockedFeature from "../billing/LockedFeature";
type Change = (patch: Partial<Wedding>) => void;

export function Field({ label, value, onChange, type = "text", textarea = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; textarea?: boolean; key?: string; }) {
  return <label>
    {label}
    {textarea ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={4} /> : <input type={type} value={value} onChange={e => onChange(e.target.value)} />}
  </label>;
}

export function InfoTab({ wedding: w, change, onUpgrade }: { wedding: Wedding; change: Change; onUpgrade: () => void; }) {
  const [slug, setSlug] = useState(w.slug);
  const originalSlug = useRef(w.slug);
  const [available, setAvailable] = useState<string>("");
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState("");
  useEffect(() => { setSlug(w.slug); }, [w.slug]);
  useEffect(() => {
    if (slug === originalSlug.current || !w.entitlements?.permanent) return;
    const timer = setTimeout(() => {
      api<{ available: boolean; valid: boolean }>(`/weddings/slug-available?slug=${encodeURIComponent(slug)}`, {}, true)
        .then(result => setAvailable(!result.valid ? "Đường dẫn không hợp lệ" : result.available ? "Đường dẫn còn trống" : "Đường dẫn đã được dùng"))
        .catch(() => setAvailable("Không thể kiểm tra đường dẫn"));
    }, 350);
    return () => clearTimeout(timer);
  }, [slug, w.entitlements?.permanent]);

  async function handleAudio(file: File) {
    setAudioBusy(true);
    setAudioError("");
    try { change({ musicUrl: await uploadAudio(file) }); }
    catch (cause) { setAudioError((cause as Error).message); }
    finally { setAudioBusy(false); }
  }

  return <div className="form-grid">
    <Field label="Tên chú rể" value={w.couple.groom} onChange={groom => change({ couple: { ...w.couple, groom } })} />
    <Field label="Tên cô dâu" value={w.couple.bride} onChange={bride => change({ couple: { ...w.couple, bride } })} />
    <Field label="Họ tên chú rể" value={w.couple.groomFull} onChange={groomFull => change({ couple: { ...w.couple, groomFull } })} />
    <Field label="Họ tên cô dâu" value={w.couple.brideFull} onChange={brideFull => change({ couple: { ...w.couple, brideFull } })} />
    <Field label="Ngày cưới" type="date" value={w.eventDate?.slice(0, 10) || ""} onChange={eventDate => change({ eventDate: eventDate || null })} />
    <Field label="Ngày hiển thị" value={w.dateText} onChange={dateText => change({ dateText })} />
    <Field label="Tên địa điểm" value={w.venue.name} onChange={name => change({ venue: { ...w.venue, name } })} />
    <Field label="Địa chỉ" value={w.venue.address} onChange={address => change({ venue: { ...w.venue, address } })} />
    <Field label="Liên kết bản đồ" type="url" value={w.venue.mapUrl} onChange={mapUrl => change({ venue: { ...w.venue, mapUrl } })} />
    <Field label="Nhóm Zalo" type="url" value={w.zaloGroupLink} onChange={zaloGroupLink => change({ zaloGroupLink })} />
    <div className="full editor-stack">
      <label>Đường dẫn thiệp
        <input value={slug} disabled={!w.entitlements?.permanent} onChange={event => {
          const next = event.target.value.toLowerCase();
          setSlug(next);
          change({ slug: next });
        }} />
      </label>
      {w.entitlements?.permanent ? <p role="status">{available} Đường dẫn cũ vẫn tiếp tục hoạt động sau khi đổi.</p> : <LockedFeature plan="premium" label="Đổi đường dẫn thiệp" onUpgrade={onUpgrade} />}
    </div>
    <div className="full editor-stack">
      <Field label="Nhạc nền (URL)" type="url" value={w.musicUrl} onChange={musicUrl => change({ musicUrl })} />
      <label>Tải tệp nhạc (tối đa 15 MB)
        <input type="file" accept="audio/*" disabled={audioBusy} onChange={event => { const file = event.target.files?.[0]; if (file) void handleAudio(file); }} />
      </label>
      {audioBusy && <p role="status">Đang tải nhạc…</p>}
      {audioError && <p role="alert" className="error">{audioError}</p>}
      {w.musicUrl && <audio controls src={w.musicUrl} />}
      {!w.entitlements?.customMusic && <LockedFeature plan="premium" label="Nhạc nền riêng" onUpgrade={onUpgrade} />}
    </div>
    <label>Màu chủ đạo
      <input type="color" value={w.theme.primary || "#b76e79"} onChange={e => change({ theme: { primary: e.target.value } })} />
    </label>
    <Field label="Tiêu đề chia sẻ (để trống = tự tạo)" value={w.meta.title} onChange={title => change({ meta: { ...w.meta, title } })} />
    <Field label="Mô tả chia sẻ (để trống = tự tạo)" value={w.meta.description} onChange={description => change({ meta: { ...w.meta, description } })} />
    <label className="checkbox-row full">
      <input type="checkbox" checked={w.published} onChange={e => change({ published: e.target.checked })} /> Xuất bản thiệp
    </label>
  </div>;
}

