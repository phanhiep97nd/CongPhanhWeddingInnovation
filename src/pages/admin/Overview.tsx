import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { AdminStats } from "../../lib/types";
import { money } from "../../components/billing/UpgradePanel";

export default function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<AdminStats>("/admin/stats", {}, true).then(setStats).catch(cause => setError((cause as Error).message)); }, []);
  return <div className="editor-stack">
    <h1>Tổng quan</h1>
    {error && <p role="alert" className="error">{error}</p>}
    {!stats && !error && <p>Đang tải số liệu…</p>}
    {stats && <>
      <dl className="admin-stats">
        {([
          ["Người dùng", stats.users], ["Tài khoản bị khoá", stats.lockedUsers],
          ["Thiệp", stats.weddings], ["Khách mời", stats.guests],
          ["Thiệp trả phí", stats.paidWeddings], ["Doanh thu", money(stats.revenue)],
        ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <h2>Số thiệp theo gói</h2>
      <dl className="admin-stats"><div><dt>Miễn phí</dt><dd>{stats.planCounts.free}</dd></div><div><dt>Cơ bản</dt><dd>{stats.planCounts.basic}</dd></div><div><dt>Cao cấp</dt><dd>{stats.planCounts.premium}</dd></div></dl>
      <h2>Doanh thu theo tháng</h2>
      <table className="admin-table"><thead><tr><th>Tháng</th><th>Số đơn</th><th>Doanh thu</th></tr></thead><tbody>
        {stats.revenueByMonth.map(month => <tr key={month.month}><td>{month.month}</td><td>{month.orders}</td><td>{money(month.amount)}</td></tr>)}
      </tbody></table>
    </>}
  </div>;
}
