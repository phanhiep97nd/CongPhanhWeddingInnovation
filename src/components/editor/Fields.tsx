import type { Wedding } from "../../lib/types";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { uploadAudio } from "../../lib/images";
import LockedFeature from "../billing/LockedFeature";
import SharePreview from "./SharePreview";
import ImageField from "./ImageField";
import { slugify } from "../../lib/links";
import DateInput from "./DateInput";
import MapField from "./MapField";
import { invitationKinds } from '../../lib/templateLibrary';
type Change = (patch: Partial<Wedding>) => void;

export function Field({ label, value, onChange, type = "text", textarea = false, autoComplete, inputMode }: { label: string; value: string; onChange: (value: string) => void; type?: string; textarea?: boolean; autoComplete?: string; inputMode?: "numeric" | "tel" | "url" | "email"; key?: string; }) {
  return <label>
    {label}
    {textarea ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={4} /> : <input type={type} inputMode={inputMode || (type === "tel" || type === "url" || type === "email" ? type : undefined)} autoComplete={autoComplete} enterKeyHint="next" value={value} onChange={e => onChange(e.target.value)} />}
  </label>;
}

// What the card says: who, when and where. These drive names, calendars, dates, lunar dates, the envelope
// and map buttons on library cards, so they come first in the editor.
export function BasicInfoFields({ wedding: w, change }: { wedding: Wedding; change: Change }) {
  const imported = Boolean(w.importedTemplate);
  return <div className="form-grid">
    <label className="full">Loại thiệp<select value={w.invitationKind || 'wedding'} onChange={e => change({ invitationKind: e.target.value as Wedding['invitationKind'] })}>{invitationKinds.map(kind => <option key={kind.id} value={kind.id}>{kind.label}</option>)}</select></label>
    {w.invitationKind && w.invitationKind !== 'wedding' && <Field label="Tên sự kiện" value={w.eventTitle || ''} onChange={eventTitle => change({ eventTitle })} />}
    {(!w.invitationKind || w.invitationKind === 'wedding') && <><Field label="Tên chú rể" autoComplete="given-name" value={w.couple.groom} onChange={groom => change({ couple: { ...w.couple, groom } })} />
    <Field label="Tên cô dâu" value={w.couple.bride} onChange={bride => change({ couple: { ...w.couple, bride } })} />
    <Field label="Họ tên chú rể" value={w.couple.groomFull} onChange={groomFull => change({ couple: { ...w.couple, groomFull } })} />
    <Field label="Họ tên cô dâu" value={w.couple.brideFull} onChange={brideFull => change({ couple: { ...w.couple, brideFull } })} /></>}
    <label>{!w.invitationKind || w.invitationKind === 'wedding' ? 'Ngày cưới' : 'Ngày tổ chức'}<DateInput value={w.eventDate} onChange={eventDate => change({ eventDate })} /></label>
    <Field label="Giờ làm lễ" type="time" value={w.eventTime || ""} onChange={eventTime => change({ eventTime })} />
    {/* Library cards compute their date text from the wedding date. */}
    {!imported && <Field label="Ngày hiển thị" value={w.dateText} onChange={dateText => change({ dateText })} />}
    <Field label="Tên địa điểm" value={w.venue.name} onChange={name => change({ venue: { ...w.venue, name } })} />
    <Field label="Địa chỉ" value={w.venue.address} onChange={address => change({ venue: { ...w.venue, address } })} />
    <MapField value={w.venue.mapUrl} onChange={mapUrl => change({ venue: { ...w.venue, mapUrl } })} />
  </div>;
}

// How the card is shared: its address, music, link preview and whether guests can open it.
export function SharingFields({ wedding: w, change, onUpgrade }: { wedding: Wedding; change: Change; onUpgrade: () => void; }) {
  const [slug, setSlug] = useState(w.slug);
  const originalSlug = useRef(w.slug);
  // The address only reaches the draft once it is valid and free, so saving never trips over a taken link.
  const [slugStatus, setSlugStatus] = useState<{ tone: "" | "ok" | "error" | "pending"; text: string }>({ tone: "", text: "" });
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState("");
  useEffect(() => { setSlug(w.slug); }, [w.slug]);
  useEffect(() => {
    if (!w.entitlements?.permanent) return;
    if (slug === originalSlug.current) { setSlugStatus({ tone: "", text: "" }); if (w.slug !== slug) change({ slug }); return; }
    if (!slug) { setSlugStatus({ tone: "error", text: "Hãy nhập đường dẫn cho thiệp." }); return; }
    setSlugStatus({ tone: "pending", text: "Đang kiểm tra…" });
    let alive = true;
    const timer = setTimeout(() => {
      api<{ available: boolean; valid: boolean }>(`/weddings/slug-available?slug=${encodeURIComponent(slug)}`, {}, true)
        .then(result => {
          if (!alive) return;
          if (!result.valid) setSlugStatus({ tone: "error", text: "Chỉ dùng chữ thường không dấu, số và dấu gạch ngang (3–50 ký tự)." });
          else if (!result.available) setSlugStatus({ tone: "error", text: "Đường dẫn này đã có thiệp khác dùng. Hãy chọn đường dẫn khác." });
          else { setSlugStatus({ tone: "ok", text: "Đường dẫn còn trống." }); change({ slug }); }
        })
        .catch(() => { if (alive) setSlugStatus({ tone: "error", text: "Không kiểm tra được đường dẫn, hãy thử lại." }); });
    }, 350);
    return () => { alive = false; clearTimeout(timer); };
  }, [slug, w.entitlements?.permanent]);
  const suggestion = slugify(!w.invitationKind || w.invitationKind === "wedding" ? [w.couple.groom, w.couple.bride].filter(Boolean).join("-") : w.eventTitle || "");

  async function handleAudio(file: File) {
    setAudioBusy(true);
    setAudioError("");
    try { change({ musicUrl: await uploadAudio(file) }); }
    catch (cause) { setAudioError((cause as Error).message); }
    finally { setAudioBusy(false); }
  }

  // Library cards render their own design: the accent colour and Zalo group only reach the original Hỷ Thiệp layouts.
  const imported = Boolean(w.importedTemplate);
  return <div className="form-grid">
    {!imported && <Field label="Nhóm Zalo" type="url" value={w.zaloGroupLink} onChange={zaloGroupLink => change({ zaloGroupLink })} />}
    <div className="full editor-stack">
      <label>Đường dẫn thiệp
        <input value={slug} disabled={!w.entitlements?.permanent} aria-invalid={slugStatus.tone === "error" || undefined} onChange={event => setSlug(slugify(event.target.value) + (/[-\s]$/.test(event.target.value) ? "-" : ""))} />
      </label>
      {w.entitlements?.permanent ? <>
        {suggestion && suggestion !== slug && <button type="button" className="text-button slug-suggestion" onClick={() => setSlug(suggestion)}>Dùng theo tên: /w/{suggestion}</button>}
        <p role="status" className={`slug-status${slugStatus.tone ? ` is-${slugStatus.tone}` : ""}`}>{slugStatus.text} Đường dẫn cũ vẫn tiếp tục hoạt động sau khi đổi.</p>
      </> : <LockedFeature plan="premium" label="Đổi đường dẫn thiệp" onUpgrade={onUpgrade} />}
    </div>
    <div className="full editor-stack">
      {/* One background track: upload a file, or paste a link to one already online. */}
      <span className="field-label">Nhạc nền</span>
      {w.musicUrl ? <div className="music-current"><audio controls src={w.musicUrl} /><button type="button" className="text-button" onClick={() => change({ musicUrl: "" })}>Bỏ nhạc</button></div>
        : <p className="field-hint">{imported ? "Chưa chọn nhạc: thiệp phát nhạc có sẵn của mẫu (nếu mẫu có)." : "Chưa có nhạc nền."}</p>}
      <label className={`button-outline music-upload${audioBusy || !w.entitlements?.customMusic ? " is-disabled" : ""}`}>{audioBusy ? "Đang tải nhạc…" : w.musicUrl ? "Đổi tệp nhạc" : "Tải tệp nhạc lên"} <small>(tối đa 15 MB)</small>
        <input type="file" accept="audio/*" disabled={audioBusy || !w.entitlements?.customMusic} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void handleAudio(file); }} />
      </label>
      <details className="music-link"><summary>Hoặc dán đường dẫn nhạc (HTTPS)</summary>
        <input type="url" aria-label="Đường dẫn nhạc nền" disabled={!w.entitlements?.customMusic} value={w.musicUrl} placeholder="https://…" onChange={event => change({ musicUrl: event.target.value })} />
      </details>
      {imported && w.musicUrl && <p className="field-hint">Nhạc này thay nhạc có sẵn của mẫu; mẫu không có nhạc sẽ có nút ♪ để khách bật.</p>}
      {audioError && <p role="alert" className="error">{audioError}</p>}
      {!w.entitlements?.customMusic && <LockedFeature plan="premium" label="Nhạc nền riêng" onUpgrade={onUpgrade} />}
    </div>
    {/* Paid cards drop the thin hythiep.net line at the end of the card; free cards see the option greyed out. */}
    <div className="full editor-stack">
      <label className={`checkbox-row${w.entitlements?.removeBranding ? "" : " is-locked"}`}><input type="checkbox" checked={Boolean(w.entitlements?.removeBranding)} disabled /> Ẩn dòng “hythiep.net” ở cuối thiệp</label>
      {!w.entitlements?.removeBranding && <LockedFeature plan="basic" label="Ẩn dòng thương hiệu" onUpgrade={onUpgrade} />}
    </div>
    {!imported && <label>Màu chủ đạo
      <input type="color" value={w.theme.primary || "#b76e79"} onChange={e => change({ theme: { ...w.theme, primary: e.target.value } })} />
    </label>}
    {/* Optional: by default a shared link shows the card's banner photo. */}
    <details className="full share-image-option" open={Boolean(w.ogImage)}>
      <summary>Tuỳ chọn: dùng ảnh khác khi chia sẻ link</summary>
      <p className="field-hint">{imported ? "Mặc định, tin nhắn chia sẻ dùng ảnh đầu thiệp: ảnh đầu tiên bạn đã đặt trên thiệp, nếu chưa có thì ảnh bìa của mẫu." : "Mặc định, tin nhắn chia sẻ dùng ảnh bìa của thiệp."}</p>
      <ImageField label="Ảnh khi chia sẻ link" value={w.ogImage} onChange={ogImage => change({ ogImage })} />
      {w.ogImage && <button type="button" className="text-button" onClick={() => change({ ogImage: "" })}>Dùng lại ảnh mặc định</button>}
    </details>
    <ShareField label="Tiêu đề chia sẻ (để trống = tự tạo)" value={w.meta.title} onChange={title => change({ meta: { ...w.meta, title } })} />
    <ShareField label="Mô tả chia sẻ (để trống = tự tạo)" value={w.meta.description} onChange={description => change({ meta: { ...w.meta, description } })} />
    <div className="full"><SharePreview wedding={w} /></div>
    {/* Library cards set this from the studio toolbar, next to the other card effects. */}
    {!imported && <label className="checkbox-row full">
      <input type="checkbox" checked={w.theme.blessings !== false} onChange={e => change({ theme: { ...w.theme, blessings: e.target.checked } })} /> Lời chúc của khách tự chạy trên thiệp
    </label>}
    <label className="checkbox-row full">
      <input type="checkbox" checked={w.published} onChange={e => change({ published: e.target.checked })} /> Xuất bản thiệp (khách mở được link)
    </label>
    <p className="full field-hint">{w.published ? 'Khách đang mở được thiệp qua đường dẫn chung và link riêng của từng khách. Bỏ chọn để tạm ẩn thiệp; bạn vẫn sửa và xem trước được.' : 'Thiệp đang ẩn: mọi đường dẫn của thiệp báo "Không tìm thấy thiệp", khách chưa xem, xác nhận tham dự hay gửi lời chúc được. Chọn để xuất bản.'}</p>
  </div>;
}

const placeholders = ["khach", "chure", "codau", "ngay", "thu", "gio", "diadiem", "diachi"];

export function ShareField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  function insert(token: string) {
    const element = input.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    onChange(`${value.slice(0, start)}{${token}}${value.slice(end)}`);
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + token.length + 2, start + token.length + 2);
    });
  }
  return <div className="share-field">
    <label>{label}
      <input ref={input} value={value} onChange={event => onChange(event.target.value)} />
    </label>
    <small>Chạm để chèn tên khách, cặp đôi, ngày, giờ hoặc địa điểm:</small>
    <div className="placeholder-chips">
      {placeholders.map(token => <button key={token} type="button" onMouseDown={event => event.preventDefault()} onClick={() => insert(token)}>{`{${token}}`}</button>)}
    </div>
  </div>;
}

