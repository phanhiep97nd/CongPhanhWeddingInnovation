import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, json } from "../../lib/api";
import type { AdminUser, Order, Plan, WeddingSummary } from "../../lib/types";
import { money, planName } from "../../components/billing/UpgradePanel";

interface Detail { user: AdminUser; weddings: WeddingSummary[]; orders: Order[]; }

export default function UserDetail() {
  const { id = "" } = useParams();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => { api<Detail>(`/admin/users/${id}`, {}, true).then(setDetail).catch(cause => setError((cause as Error).message)); }, [id, version]);

  async function patchUser(patch: { role?: string; status?: string }) {
    if (!detail || !window.confirm(`Cập nhật quyền hoặc trạng thái của ${detail.user.email}?`)) return;
    try { await api(`/admin/users/${id}`, json("PATCH", patch), true); setVersion(value => value + 1); }
    catch (cause) { setError((cause as Error).message); }
  }

  async function changePlan(wedding: WeddingSummary, plan: Plan) {
    if (plan === wedding.plan || !window.confirm(`Đổi gói thiệp ${wedding.slug} sang ${planName(plan)}?`)) return;
    try { await api(`/admin/weddings/${wedding.id}/plan`, json("PATCH", { plan }), true); setVersion(value => value + 1); }
    catch (cause) { setError((cause as Error).message); }
  }

  return <div className="editor-stack">
    <Link to="/admin/users">← Người dùng</Link>
    {error && <p role="alert" className="error">{error}</p>}
    {!detail && !error && <p>Đang tải chi tiết…</p>}
    {detail && <>
      <h1>{detail.user.name}</h1>
      <p>{detail.user.email} · {detail.user.role} · {detail.user.status}</p>
      <div className="actions">
        <button onClick={() => void patchUser({ status: detail.user.status === "locked" ? "active" : "locked" })}>{detail.user.status === "locked" ? "Mở khoá" : "Khoá"}</button>
        <button onClick={() => void patchUser({ role: detail.user.role === "admin" ? "user" : "admin" })}>{detail.user.role === "admin" ? "Gỡ quyền admin" : "Cấp quyền admin"}</button>
      </div>
      <h2>Thiệp cưới</h2>
      {!detail.weddings.length && <p>Chưa có thiệp.</p>}
      {detail.weddings.map(wedding => <article className="admin-row" key={wedding.id}>
        <div><strong>{wedding.couple.groom} & {wedding.couple.bride}</strong><p>/w/{wedding.slug}</p></div>
        <span>{wedding.guestCount} khách</span>
        <label>Gói thiệp<select value={wedding.plan || "free"} onChange={event => void changePlan(wedding, event.target.value as Plan)}><option value="free">Miễn phí</option><option value="basic">Cơ bản</option><option value="premium">Cao cấp</option></select></label>
      </article>)}
      <h2>Đơn hàng</h2>
      {!detail.orders.length && <p>Chưa có đơn hàng.</p>}
      {detail.orders.map(order => <p key={order.id}>#{order.orderCode} · {planName(order.plan)} · {money(order.amount)} · {order.status}</p>)}
    </>}
  </div>;
}
