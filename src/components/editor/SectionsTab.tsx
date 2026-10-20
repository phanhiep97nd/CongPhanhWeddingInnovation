import type { Wedding } from "../../lib/types";
import { addCustomSection, clientId, moveSection, removeCustomSection, sectionLabel, toggleSection } from "../../lib/sections";
import { Field } from "./Fields";
import ImageField from "./ImageField";
import LockedFeature from "../billing/LockedFeature";

export default function SectionsTab({ wedding: w, change, onUpgrade = () => {} }: { wedding: Wedding; change: (patch: Partial<Wedding>) => void; onUpgrade?: () => void; }) {
  return <div className="editor-stack">
    <p>Bật, tắt và sắp xếp các hạng mục trên thiệp.
    </p>
    {w.sections.map((item, i) => {
      const custom = w.customSections.find(c => item.key === `custom:${c.id}`);
      return <article key={item.key} className="editor-item">
        <div className="section-row">
          <label className="checkbox-row">
            <input type="checkbox" checked={item.enabled} onChange={() => change({ sections: toggleSection(w.sections, item.key) })} />
            {sectionLabel(item.key, w.customSections)}
          </label>
          {item.key === "photoWall" && !w.entitlements?.photoWall && <LockedFeature plan="premium" label="Ảnh khách gửi" onUpgrade={onUpgrade} />}
          {item.key === "giftBox" && !w.entitlements?.giftBox && <LockedFeature plan="premium" label="Hộp mừng cưới" onUpgrade={onUpgrade} />}
          <div className="actions">
            <button aria-label={`Chuyển ${sectionLabel(item.key, w.customSections)} lên`} disabled={i === 0} onClick={() => change({ sections: moveSection(w.sections, i, -1) })}>↑
            </button>
            <button aria-label={`Chuyển ${sectionLabel(item.key, w.customSections)} xuống`} disabled={i === w.sections.length - 1} onClick={() => change({ sections: moveSection(w.sections, i, 1) })}>↓
            </button>
            {custom && <button onClick={() => { if (window.confirm(`Xóa hạng mục ${custom.title}?`)) change(removeCustomSection(w.sections, w.customSections, custom.id)); }}>Xóa
            </button>}
          </div>
        </div>
        {custom && <div className="form-grid">
          <Field label="Tiêu đề" value={custom.title} onChange={title => change({ customSections: w.customSections.map(c => c.id === custom.id ? { ...c, title } : c) })} />
          <Field label="Nội dung" value={custom.body} textarea onChange={body => change({ customSections: w.customSections.map(c => c.id === custom.id ? { ...c, body } : c) })} />
          <ImageField label="Ảnh" value={custom.image} onChange={image => change({ customSections: w.customSections.map(c => c.id === custom.id ? { ...c, image } : c) })} />
        </div>}
      </article>;
    })}
    <button className="button-outline" onClick={() => change(addCustomSection(w.sections, w.customSections, { id: clientId(), title: "Hạng mục mới", body: "", image: "" }))}>Thêm hạng mục tùy chỉnh
    </button>
  </div>;
}

