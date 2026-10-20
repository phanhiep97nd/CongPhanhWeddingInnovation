import type { Wedding } from "../../lib/types";
type Change = (patch: Partial<Wedding>) => void;

export function Field({ label, value, onChange, type = "text", textarea = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; textarea?: boolean; key?: string; }) {
  return <label>
    {label}
    {textarea ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={4} /> : <input type={type} value={value} onChange={e => onChange(e.target.value)} />}
  </label>;
}

export function InfoTab({ wedding: w, change }: { wedding: Wedding; change: Change; }) {
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
    <Field label="Nhạc nền" type="url" value={w.musicUrl} onChange={musicUrl => change({ musicUrl })} />
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

