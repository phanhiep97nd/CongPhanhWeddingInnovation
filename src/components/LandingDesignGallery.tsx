import { useState } from "react";
import { Link } from "react-router-dom";
import { invitationDesigns } from "../lib/invitationDesigns";

export default function LandingDesignGallery() {
  const [category, setCategory] = useState("Tất cả");
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<(typeof invitationDesigns)[number] | null>(null);
  const filtered = invitationDesigns.filter(item => category === "Tất cả" || item.category === category);
  const visible = expanded ? filtered : filtered.slice(0, 6);
  return <section className="landing-design-gallery" aria-labelledby="landing-design-heading">
    <div className="landing-section-heading">
      <p className="landing-eyebrow">Bộ sưu tập</p>
      <h2 id="landing-design-heading">Chọn sắc thái cho lời mời</h2>
      <p>24 phong cách để khám phá. Sau khi tạo thiệp, hai bạn chỉnh nội dung và gửi link có tên riêng cho từng khách trong cùng một editor.</p>
    </div>
    <div className="design-filters" role="group" aria-label="Lọc phong cách thiệp">
      {["Tất cả", "Truyền thống", "Hoa lá", "Tối giản"].map(value => <button key={value} type="button" className={category === value ? "active" : ""} onClick={() => { setCategory(value); setExpanded(false); }}>{value}</button>)}
    </div>
    <div className="design-grid">{visible.map(item => <button className="design-option" type="button" key={item.key} onClick={() => setSelected(item)} aria-label={`Xem trước phong cách ${item.name}`}>
      <span className={"design-card design-card-" + (item.family)} style={{ background: item.paper, color: item.ink, borderColor: item.accent }}>
        <span className="design-mark" style={{ color: item.accent }}>{item.category === "Truyền thống" ? "囍" : item.category === "Hoa lá" ? "✿" : "♡"}</span>
        <span className="design-names">Phương Anh<i>&</i>Minh Công</span>
        <span className="design-date">03 · 04 · 2026</span>
      </span><strong>{item.name}</strong><small>{item.category}</small>
    </button>)}</div>
    {!expanded && filtered.length > visible.length && <button type="button" className="button-outline" onClick={() => setExpanded(true)}>Xem tất cả {filtered.length} phong cách</button>}
    {selected && <div className="design-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}>
      <div className="design-modal" role="dialog" aria-modal="true" aria-labelledby="design-modal-title">
        <button type="button" className="design-modal-close" onClick={() => setSelected(null)} aria-label="Đóng xem trước">×</button>
        <div className={"design-card design-card-" + (selected.family)} style={{ background: selected.paper, color: selected.ink, borderColor: selected.accent }}>
          <span className="design-mark" style={{ color: selected.accent }}>{selected.category === "Truyền thống" ? "囍" : selected.category === "Hoa lá" ? "✿" : "♡"}</span>
          <span className="design-names">Phương Anh<i>&</i>Minh Công</span>
          <span className="design-date">03 · 04 · 2026</span>
        </div>
        <div><p className="landing-eyebrow">{selected.category}</p><h3 id="design-modal-title">{selected.name}</h3><p>{selected.description}</p><p>Đây là phác họa phong cách. Thiệp thật sẽ dùng ảnh, tên, ngày cưới và lời mời do hai bạn nhập.</p><Link className="button" to="/register">Tạo thiệp</Link></div>
      </div>
    </div>}
  </section>;
}
