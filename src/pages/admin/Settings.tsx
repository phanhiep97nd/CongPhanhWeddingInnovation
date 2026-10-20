import { useEffect, useState, type FormEvent } from "react";
import { api, json } from "../../lib/api";
import type { Settings as SettingsType } from "../../lib/types";

const fields = [
  ["basic", "Giá gói Cơ bản", 1000, 10000000],
  ["premium", "Giá gói Cao cấp", 1000, 10000000],
  ["freeGuestLimit", "Giới hạn khách miễn phí", 1, 1000],
  ["freeGalleryLimit", "Giới hạn ảnh miễn phí", 1, 1000],
  ["paidGalleryLimit", "Giới hạn ảnh trả phí", 1, 1000],
  ["freeExpiryDays", "Số ngày hết hạn", 1, 3650],
] as const;

export default function Settings() {
  const [saved, setSaved] = useState<SettingsType | null>(null);
  const [draft, setDraft] = useState<SettingsType | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<SettingsType>("/admin/settings", {}, true).then(value => { setSaved(value); setDraft(value); }).catch(cause => setError((cause as Error).message)); }, []);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const valid = !!draft && fields.every(([key, , min, max]) => {
    const value = key === "basic" || key === "premium" ? draft.prices[key] : draft[key];
    return Number.isInteger(value) && value >= min && value <= max;
  }) && draft.prices.premium > draft.prices.basic;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || !valid) return;
    setBusy(true);
    setError("");
    try { const result = await api<SettingsType>("/admin/settings", json("PUT", draft), true); setSaved(result); setDraft(result); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="editor-stack">
    <h1>Cài đặt</h1>
    {error && <p role="alert" className="error">{error}</p>}
    {!draft && !error && <p>Đang tải cài đặt…</p>}
    {draft && <form className="editor-stack" onSubmit={event => void save(event)}>
      <div className="form-grid">{fields.map(([key, label, min, max]) => <label key={key}>{label}<input type="number" min={min} max={max} value={key === "basic" || key === "premium" ? draft.prices[key] : draft[key]} onChange={event => {
        const value = Number(event.target.value);
        setDraft(current => current && (key === "basic" || key === "premium" ? { ...current, prices: { ...current.prices, [key]: value } } : { ...current, [key]: value }));
      }} /></label>)}</div>
      {!valid && <p role="alert" className="error">Giá phải từ 1.000 đến 10.000.000đ, giới hạn từ 1 đến 1.000, số ngày từ 1 đến 3.650; giá Cao cấp phải cao hơn Cơ bản.</p>}
      <button className="button" disabled={!dirty || !valid || busy}>{busy ? "Đang lưu…" : "Lưu cài đặt"}</button>
      <p role="status">{dirty ? "Có thay đổi chưa lưu" : "Đã lưu"}</p>
    </form>}
  </div>;
}
