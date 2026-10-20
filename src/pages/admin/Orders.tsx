import { useEffect, useState } from "react";
import { api, json } from "../../lib/api";
import type { Order, PageResult } from "../../lib/types";
import { money, planName } from "../../components/billing/UpgradePanel";

export default function Orders() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<Order> | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      api<PageResult<Order>>(`/admin/orders?q=${encodeURIComponent(query)}&status=${status}&page=${page}&limit=20`, {}, true)
        .then(setData).catch(cause => setError((cause as Error).message));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, status, page, version]);

  async function markPaid(order: Order) {
    if (!window.confirm(`Xác nhận đã thanh toán đơn #${order.orderCode} (${money(order.amount)})?`)) return;
    try {
      await api(`/admin/orders/${order.orderCode}/mark-paid`, json("POST"), true);
      setVersion(value => value + 1);
    } catch (cause) { setError((cause as Error).message); }
  }

  return <div className="editor-stack">
    <h1>Đơn hàng</h1>
    <div className="form-grid"><label>Tìm đơn hàng<input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></label>
      <label>Trạng thái<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Tất cả</option><option value="pending">Chờ thanh toán</option><option value="paid">Đã thanh toán</option><option value="cancelled">Đã huỷ</option><option value="expired">Hết hạn</option></select></label>
    </div>
    {error && <p role="alert" className="error">{error}</p>}
    {!data && !error && <p>Đang tải đơn hàng…</p>}
    {data && <>
      {!data.items.length && <p>Không có đơn hàng.</p>}
      <div className="admin-list">{data.items.map(order => <article className="admin-row" key={order.id}>
        <div><strong>#{order.orderCode}</strong><p>{order.userEmail} · {order.weddingSlug}</p></div>
        <span>{planName(order.plan)} · {money(order.amount)}</span>
        <span className={`status-chip status-${order.status}`}>{order.status}</span>
        {order.status === "pending" && <button onClick={() => void markPaid(order)}>Xác nhận đã thanh toán</button>}
      </article>)}</div>
      <div className="actions"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button><span>Trang {page} / {Math.max(1, Math.ceil(data.total / data.limit))}</span><button disabled={page * data.limit >= data.total} onClick={() => setPage(page + 1)}>Sau</button></div>
    </>}
  </div>;
}
