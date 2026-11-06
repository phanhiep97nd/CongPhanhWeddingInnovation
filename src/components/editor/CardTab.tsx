import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { Wedding } from "../../lib/types";
import { BasicInfoFields, SharingFields } from "./Fields";
import ImagesTab from "./ImagesTab";
import ContentTab from "./ContentTab";
import SectionsTab from "./SectionsTab";
import ViewModesSetting from "./ViewModesSetting";
import ImportedTemplateEditor from "./ImportedTemplateEditor";
import GiftBoxEditor from "./GiftBoxEditor";
import LockedFeature from "../billing/LockedFeature";

type Props = { wedding: Wedding; change: (patch: Partial<Wedding>) => void; onUpgrade: () => void; focusTemplates?: boolean };

// Panels build their content on first open, so closed sections do not fetch libraries or guest lists.
function Panel({ title, hint, open = false, children }: { title: string; hint: string; open?: boolean; children: ReactNode }) {
  const [seen, setSeen] = useState(open);
  return <details className="card-panel" open={open} onToggle={event => { if (event.currentTarget.open) setSeen(true); }}>
    <summary><span><strong>{title}</strong><small>{hint}</small></span><ChevronDown size={18} aria-hidden="true" /></summary>
    {seen && <div className="card-panel-body">{children}</div>}
  </details>;
}

function OriginalStyles({ wedding: w, change, onUpgrade }: Props) {
  return <>
    <h3>Giao diện Hỷ Thiệp</h3>
    <div className="template-picker">
      <button className={w.template !== "minimal" && w.template !== "hy3d" ? "selected" : ""} onClick={() => change({ template: "classic", theme: { primary: w.theme.primary, ...(w.theme.blessings === false ? { blessings: false } : {}) } })}><span className="template-thumb classic-thumb">C & P</span>Cổ điển</button>
      <button className={w.template === "minimal" ? "selected" : ""} disabled={!w.entitlements?.premiumTemplates} onClick={() => change({ template: "minimal" })}><span className="template-thumb minimal-thumb">C / P</span>Tối giản</button>
      <button className={w.template === "hy3d" ? "selected" : ""} disabled={!w.entitlements?.premiumTemplates} onClick={() => change({ template: "hy3d" })}><span className="template-thumb hy3d-thumb">3D</span>Hỷ 3D</button>
    </div>
    {!w.entitlements?.premiumTemplates && <LockedFeature plan="premium" label="Mẫu Tối giản" onUpgrade={onUpgrade} />}
    {w.template === "hy3d" && <ViewModesSetting wedding={w} change={change} />}
  </>;
}

// One line that says who, when and where, or what is still missing.
function summary(w: Wedding) {
  const wedding = !w.invitationKind || w.invitationKind === "wedding";
  const who = wedding ? [w.couple.groom, w.couple.bride].filter(Boolean).join(" & ") : w.eventTitle || "";
  const when = w.eventDate ? new Date(w.eventDate).toLocaleDateString("vi-VN", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }) : "";
  const missing = [!who && (wedding ? "tên cô dâu chú rể" : "tên sự kiện"), !when && (wedding ? "ngày cưới" : "ngày tổ chức")].filter(Boolean);
  return { text: [who, when, w.eventTime, w.venue.name].filter(Boolean).join(" · ") || "Tên, ngày giờ, địa điểm", missing };
}

// Basic information first (it fills names, dates, calendars and the envelope), then the card itself, then sharing.
function BasicPanel({ wedding: w, change, focusTemplates }: Props) {
  const { text, missing } = summary(w);
  // Original layouts are edited through these fields, so they start open there; library cards fold them once complete.
  const open = !focusTemplates && (!w.importedTemplate || missing.length > 0);
  return <Panel open={open} title="Thông tin cơ bản" hint={missing.length ? `Còn thiếu ${missing.join(" và ")}` : text}>
    {missing.length > 0 && <p className="card-panel-nudge">Nhập {missing.join(" và ")} để thiệp tự điền tên, lịch, ngày giờ, ngày âm lịch và phong thư.</p>}
    <BasicInfoFields wedding={w} change={change} />
  </Panel>;
}
// Card settings: the gift box shown behind the "Hộp quà" button, then sharing.
const GiftPanel = ({ wedding: w, change }: Props) => <Panel title="Hộp mừng cưới" hint={w.giftBox?.accounts.length ? `${w.giftBox.accounts.length} tài khoản / mã QR · nút Hộp quà trên thiệp` : "Tài khoản ngân hàng, mã QR để khách gửi quà"}>
  <GiftBoxEditor wedding={w} change={change} />
</Panel>;
const SharingPanel = ({ wedding: w, change, onUpgrade }: Props) => <Panel title="Chia sẻ & cài đặt" hint={`${w.published ? "Đã xuất bản" : "Đang ẩn"} · đường dẫn, nhạc nền, nội dung khi chia sẻ`}>
  <SharingFields wedding={w} change={change} onUpgrade={onUpgrade} />
</Panel>;

// Everything that shapes the invitation lives in one tab: a library template is edited directly on the card,
// while the original Hỷ Thiệp renderer keeps its sections as collapsible panels.
export default function CardTab(props: Props) {
  const { wedding: w, change, onUpgrade } = props;
  if (w.importedTemplate) return <div className="editor-stack card-tab">
    <BasicPanel {...props} />
    <ImportedTemplateEditor wedding={w} change={change} />
    <GiftPanel {...props} />
    <SharingPanel {...props} />
  </div>;
  return <div className="editor-stack card-tab">
    <BasicPanel {...props} />
    <Panel title="Ảnh" hint="Ảnh bìa, ảnh câu chuyện, bộ sưu tập"><ImagesTab wedding={w} change={change} onUpgrade={onUpgrade} /></Panel>
    <Panel title="Nội dung" hint="Câu chuyện, lịch trình, trang phục"><ContentTab wedding={w} change={change} /></Panel>
    <Panel title="Hạng mục" hint="Bật, tắt và sắp xếp các phần trên thiệp"><SectionsTab wedding={w} change={change} onUpgrade={onUpgrade} /></Panel>
    <Panel open={props.focusTemplates} title="Mẫu thiệp" hint="Giao diện Hỷ Thiệp hoặc chọn mẫu trong bộ sưu tập"><OriginalStyles {...props} /><ImportedTemplateEditor wedding={w} change={change} /></Panel>
    <GiftPanel {...props} />
    <SharingPanel {...props} />
  </div>;
}
