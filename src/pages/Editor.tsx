import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, json } from "../lib/api";
import type { Wedding } from "../lib/types";
import { InfoTab } from "../components/editor/Fields";
import ImagesTab from "../components/editor/ImagesTab";
import ContentTab from "../components/editor/ContentTab";
import SectionsTab from "../components/editor/SectionsTab";
import GuestsTab from "../components/editor/GuestsTab";
import PhotosTab from "../components/editor/PhotosTab";
import GiftBoxEditor from "../components/editor/GiftBoxEditor";
import UpgradePanel from "../components/billing/UpgradePanel";
import LockedFeature from "../components/billing/LockedFeature";
import { PlanRequiredError } from "../lib/api";
type Tab = "info" | "images" | "content" | "sections" | "guests" | "photos" | "giftBox" | "templates" | "billing";
const tabs: { key: Tab; label: string; }[] = [{ key: "info", label: "Thông tin" }, { key: "images", label: "Ảnh" }, { key: "content", label: "Nội dung" }, { key: "sections", label: "Hạng mục" }, { key: "guests", label: "Khách mời" }, { key: "photos", label: "Ảnh khách gửi" }, { key: "giftBox", label: "Hộp mừng cưới" }, { key: "templates", label: "Mẫu thiệp" }, { key: "billing", label: "Gói & thanh toán" }];

export default function Editor() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<Wedding | null>(null);
  const [draft, setDraft] = useState<Wedding | null>(null);
  const [tab, setTab] = useState<Tab>("info");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [requiredPlan, setRequiredPlan] = useState<"basic" | "premium" | null>(null);
  // Read the PayOS return params once: the effect below strips them from the URL and may run twice
  // (StrictMode), so reading inside the effect would lose them on the second run.
  const [paymentReturn] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return { payment: params.get("payment"), orderCode: params.get("orderCode") };
  });
  useEffect(() => {
    const { payment, orderCode } = paymentReturn;
    const params = new URLSearchParams(window.location.search);
    if (params.has("payment")) {
      params.delete("payment");
      params.delete("orderCode");
      window.history.replaceState({}, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
    }
    if (payment === "cancel") {
      setMessage("Đã hủy thanh toán. Bạn có thể chọn lại gói bất cứ lúc nào.");
      setTab("billing");
    }
    let active = true;
    async function load() {
      let syncStatus = "";
      try {
        if (payment === "success" && orderCode) {
          setMessage("Đang xác nhận thanh toán…");
          setTab("billing");
          const result = await api<{ status: string }>(`/weddings/${id}/orders/${encodeURIComponent(orderCode)}/sync`, json("POST"), true);
          syncStatus = result.status;
        }
        const result = await api<Wedding>(`/weddings/${id}`, {}, true);
        if (!active) return;
        setSaved(result);
        setDraft(result);
        if (payment === "success") setMessage(syncStatus === "paid" ? "Thanh toán thành công. Gói thiệp đã được cập nhật." : "Thanh toán đang chờ xác nhận. Vui lòng kiểm tra lại sau.");
      } catch (cause) {
        if (active) setMessage((cause as Error).message);
      }
    }
    void load();
    return () => { active = false; };
  }, [id, paymentReturn]);
  const changes = useMemo(() => {
    if (!saved || !draft) return {} as Partial<Wedding>;
    const changed: Partial<Wedding> = {};
    for (const key of Object.keys(draft) as (keyof Wedding)[]) if (JSON.stringify(draft[key]) !== JSON.stringify(saved[key])) Object.assign(changed, { [key]: draft[key] });
    return changed;
  }, [saved, draft]);
  const dirty = Object.keys(changes).length > 0;
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const guardBack = () => {
      if (dirty && !window.confirm("Bạn có thay đổi chưa lưu. Rời trang?")) window.history.go(1);
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("popstate", guardBack);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("popstate", guardBack);
    };
  }, [dirty]);
  const change = (patch: Partial<Wedding>) => setDraft(w => w ? { ...w, ...patch } : w);
  async function save() {
    if (!dirty) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await api<Wedding>(`/weddings/${id}`, json("PUT", changes), true);
      setSaved(result);
      setDraft(result);
      setMessage("Đã lưu thay đổi.");
    } catch (e) {
      if (e instanceof PlanRequiredError) {
        setRequiredPlan(e.requiredPlan);
        setMessage("");
      } else setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  function back() {
    if (!dirty || window.confirm("Bạn có thay đổi chưa lưu. Rời trang?")) navigate("/dashboard");
  }
  if (!draft) return <main className="shell">
    <p>
      {message || "Đang tải thiệp..."}
    </p>
    <Link to="/dashboard">Về danh sách
    </Link>
  </main>;
  return <main className="editor">
    <header className="dash-header editor-sticky-header">
      <button className="text-button editor-back" onClick={back}>← <span>Thiệp của tôi</span>
      </button>
      <strong className="dash-header-title">
        {draft.couple.groom} &{" "}
        {draft.couple.bride}
      </strong>
      <span className="save-state" role="status">{saving ? "Đang lưu" : dirty ? "Chưa lưu" : "Đã lưu"}</span>
      <button className="button" disabled={!dirty || saving} onClick={() => void save()}>{saving ? "Đang lưu…" : "Lưu thay đổi"}</button>
      <a href={`/w/${draft.slug}`} target="_blank" rel="noreferrer">Xem thiệp ↗
      </a>
    </header>
    <div className="shell">
      <div className="editor-title">
        <div>
          <h1>
            {draft.couple.groom} &{" "}
            {draft.couple.bride}
          </h1>
          <p>/w/
            {draft.slug}
          </p>
          {draft.expiresAt && <p>Hết hạn {new Date(draft.expiresAt).toLocaleDateString("vi-VN")}</p>}
        </div>
      </div>
      {message && <p role="status" className="notice">
        {message}
      </p>}
      {requiredPlan && <LockedFeature plan={requiredPlan} onUpgrade={() => { setTab("billing"); setRequiredPlan(null); }} />}
      <nav className="tab-nav" aria-label="Chỉnh sửa thiệp">
        {tabs.map(item => <button key={item.key} className={tab === item.key ? "active" : ""} aria-current={tab === item.key ? "page" : undefined} onClick={() => setTab(item.key)}>
          {item.label}
        </button>)}
      </nav>
      <div className="editor-panel">
        {tab === "info" && <InfoTab wedding={draft} change={change} onUpgrade={() => setTab("billing")} />}
        {tab === "images" && <ImagesTab wedding={draft} change={change} onUpgrade={() => setTab("billing")} />}
        {tab === "content" && <ContentTab wedding={draft} change={change} />}
        {tab === "sections" && <SectionsTab wedding={draft} change={change} onUpgrade={() => setTab("billing")} />}
        {tab === "guests" && <GuestsTab wedding={draft} onUpgrade={() => setTab("billing")} />}
        {tab === "photos" && <><PhotosTab weddingId={draft.id} slug={draft.slug} />{!draft.entitlements?.photoWall && <LockedFeature plan="premium" label="Ảnh khách gửi" onUpgrade={() => setTab("billing")} />}</>}
        {tab === "giftBox" && <GiftBoxEditor wedding={draft} change={change} onUpgrade={() => setTab("billing")} />}
        {tab === "templates" && <div className="editor-stack"><h2>Mẫu thiệp</h2><div className="template-picker">
          <button className={draft.template !== "minimal" ? "selected" : ""} onClick={() => change({ template: "classic" })}><span className="template-thumb classic-thumb">C & P</span>Cổ điển</button>
          <button className={draft.template === "minimal" ? "selected" : ""} disabled={!draft.entitlements?.premiumTemplates} onClick={() => change({ template: "minimal" })}><span className="template-thumb minimal-thumb">C / P</span>Tối giản</button>
        </div>{!draft.entitlements?.premiumTemplates && <LockedFeature plan="premium" label="Mẫu Tối giản" onUpgrade={() => setTab("billing")} />}</div>}
        {tab === "billing" && <UpgradePanel wedding={draft} />}
      </div>
    </div>
  </main>;
}

