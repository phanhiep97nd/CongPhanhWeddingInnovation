import { useEffect, useState } from "react";
import { api, json } from "../../lib/api";
import type { Order, Plan, Pricing, Wedding } from "../../lib/types";
import { openCheckout } from "../../lib/checkout";

export const money = (amount: number) => `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
export const planName = (plan: Plan) => ({ free: "Miễn phí", basic: "Cơ bản", premium: "Cao cấp" })[plan];

export default function UpgradePanel({ wedding }: { wedding: Wedding }) {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"basic" | "premium" | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api<Pricing>("/public/pricing"),
      api<Order[]>(`/weddings/${wedding.id}/orders`, {}, true),
    ]).then(([nextPricing, nextOrders]) => {
      if (active) {
        setPricing(nextPricing);
        setOrders(nextOrders);
      }
    }).catch((cause) => {
      if (active) setError((cause as Error).message);
    });
    return () => { active = false; };
  }, [wedding.id]);

  async function checkout(plan: "basic" | "premium") {
    setBusy(plan);
    setError("");
    try {
      const order = await api<{ checkoutUrl: string }>(`/weddings/${wedding.id}/orders`, json("POST", { plan }), true);
      openCheckout(order.checkoutUrl);
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(null);
    }
  }

  return <div className="editor-stack billing-panel">
    <h2>Gói & thanh toán</h2>
    <p>Gói hiện tại: <strong>{planName(wedding.plan || "free")}</strong></p>
    {wedding.expiresAt && <p>Hết hạn {new Date(wedding.expiresAt).toLocaleDateString("vi-VN")}</p>}
    <p>{wedding.usage?.guests ?? 0}/{wedding.limits?.guests ?? "∞"} khách</p>
    {error && <p role="alert" className="error">{error}</p>}
    {!pricing && !error && <p role="status">Đang tải bảng giá…</p>}
    {pricing && <div className="plan-grid">
      {(["basic", "premium"] as const).map((plan) => {
        const currentPrice = wedding.plan === "basic" ? pricing.prices.basic : 0;
        const amount = pricing.prices[plan] - currentPrice;
        const active = wedding.plan === plan || wedding.plan === "premium";
        return <section key={plan} className="editor-item">
          <h3>{planName(plan)}</h3>
          <p className="plan-price">{money(pricing.prices[plan])}</p>
          {wedding.plan === "basic" && plan === "premium" && <p>Chỉ cần trả thêm {money(amount)}</p>}
          <ul>
            {pricing.features.filter(feature => feature.plan === "basic" || plan === "premium").map(feature => <li key={feature.key}>{feature.label}</li>)}
          </ul>
          <button className="button" disabled={active || busy !== null} onClick={() => void checkout(plan)}>
            {active ? "Gói hiện tại" : busy === plan ? "Đang mở thanh toán…" : `Chọn gói ${planName(plan)}`}
          </button>
        </section>;
      })}
    </div>}
    <h3>Lịch sử đơn hàng</h3>
    {!orders.length && <p>Chưa có đơn hàng.</p>}
    <ul className="order-history">
      {orders.map(order => <li key={order.id}>
        <span>#{order.orderCode} · {planName(order.plan)} · {money(order.amount)}</span>
        <span className={`status-chip status-${order.status}`}>{({ pending: "Chờ thanh toán", paid: "Đã thanh toán", cancelled: "Đã hủy", expired: "Hết hạn" })[order.status]}</span>
      </li>)}
    </ul>
  </div>;
}
