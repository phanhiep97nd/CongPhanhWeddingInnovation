import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Guest, Wedding } from "../../lib/types";
import { invitationDesigns } from "../../lib/invitationDesigns";
import LockedFeature from "../billing/LockedFeature";

export default function InvitationDesignPicker({ wedding, change, onUpgrade, dirty }: { wedding: Wedding; change: (patch: Partial<Wedding>) => void; onUpgrade: () => void; dirty: boolean }) {
  const [category, setCategory] = useState("Tất cả");
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestCode, setGuestCode] = useState("");
  useEffect(() => {
    let active = true;
    api<Guest[]>(`/weddings/${wedding.id}/guests`, {}, true).then(result => {
      if (active) setGuests(result);
    }).catch(() => {
      if (active) setGuests([]);
    });
    return () => { active = false; };
  }, [wedding.id]);
  const selected = invitationDesigns.find(item => item.key === wedding.theme.design);
  const list = invitationDesigns.filter(item => category === "Tất cả" || item.category === category);
  return <section className="design-studio" aria-labelledby="design-studio-title">
    <h3 id="design-studio-title">Bộ sưu tập 24 phong cách</h3>
    <p>Chọn diện mạo cho thiệp hiện tại. Bộ sưu tập này dùng bố cục Cổ điển của dự án. Nội dung, RSVP và đường dẫn riêng của từng khách vẫn dùng dữ liệu của thiệp này.</p>
    <div className="design-filters" role="group" aria-label="Lọc phong cách">{["Tất cả", "Truyền thống", "Hoa lá", "Tối giản"].map(value => <button type="button" key={value} aria-label={`Lọc phong cách ${value.toLocaleLowerCase("vi-VN")}`} className={category === value ? "active" : ""} onClick={() => setCategory(value)}>{value}</button>)}</div>
    <div className="design-grid">
      {category === "Tất cả" && <button type="button" className={wedding.template === "classic" && !wedding.theme.design ? "design-option selected" : "design-option"} aria-pressed={wedding.template === "classic" && !wedding.theme.design} onClick={() => change({ template: "classic", theme: { primary: "#b76e79" } })}>
        <span className="design-card" style={{ background: "#fdf5f6", color: "#4c6635", borderColor: "#c9848b" }}><span className="design-mark">♡</span><span className="design-names">{wedding.couple.bride || "Cô dâu"}<i>&</i>{wedding.couple.groom || "Chú rể"}</span><span className="design-date">Nguyên bản</span></span>
        <strong>Cổ điển</strong><small>Thiệp gốc của Hỷ Thiệp.</small>
      </button>}
      {list.map(item => <button type="button" key={item.key} className={wedding.template === "classic" && wedding.theme.design === item.key ? "design-option selected" : "design-option"} aria-pressed={wedding.template === "classic" && wedding.theme.design === item.key} disabled={!wedding.entitlements?.premiumTemplates} onClick={() => change({ template: "classic", theme: { ...wedding.theme, primary: item.accent, design: item.key } })}>
      <span className={"design-card design-card-" + (item.family)} style={{ background: item.paper, color: item.ink, borderColor: item.accent }}>
        <span className="design-mark" style={{ color: item.accent }}>{item.category === "Truyền thống" ? "囍" : item.category === "Hoa lá" ? "✿" : "♡"}</span>
        <span className="design-names">{wedding.couple.bride || "Cô dâu"}<i>&</i>{wedding.couple.groom || "Chú rể"}</span>
        <span className="design-date">{wedding.dateText || "Ngày chung đôi"}</span>
      </span><strong>{item.name}</strong><small>{item.description}</small>
    </button>)}</div>
    {selected && <p role="status">Đang chọn: {selected.name}. {dirty ? "Lưu thay đổi để xem toàn bộ thiệp." : "Có thể xem toàn bộ thiệp bên dưới."}</p>}
    {!wedding.entitlements?.premiumTemplates && <LockedFeature plan="premium" label="Bộ sưu tập mẫu" onUpgrade={onUpgrade} />}
    <div className="design-full-preview">
      <div className="design-preview-toolbar"><strong>Xem toàn bộ thiệp đã lưu</strong><div role="group" aria-label="Kích thước xem trước"><button type="button" aria-pressed={device === "phone"} onClick={() => setDevice("phone")}>Điện thoại</button><button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>Máy tính</button></div></div>
      <label> Xem như khách
        <select value={guestCode} onChange={event => setGuestCode(event.target.value)}>
          <option value="">Không chọn khách</option>
          {guests.map(guest => <option key={guest.code} value={guest.code}>{guest.invitationName}</option>)}
        </select>
      </label>
      <iframe key={`${wedding.updatedAt}:${guestCode}`} title="Xem trước thiệp" className={device === "phone" ? "design-preview-phone" : "design-preview-desktop"} src={`/w/${encodeURIComponent(wedding.slug)}${guestCode ? `/${encodeURIComponent(guestCode)}` : ""}`} loading="lazy" />
      <p>Bản xem trước dùng nội dung đã lưu. Link có tên khách được tạo trong tab Khách mời.</p>
    </div>
  </section>;
}
