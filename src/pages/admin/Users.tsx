import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, json } from "../../lib/api";
import type { AdminUser, PageResult } from "../../lib/types";
import { money } from "../../components/billing/UpgradePanel";
import { useConfirmSheet } from "../../components/ConfirmSheet";

export default function Users() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<AdminUser> | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const { confirm, sheet } = useConfirmSheet();
  useEffect(() => {
    const timer = setTimeout(() => {
      api<PageResult<AdminUser>>(`/admin/users?q=${encodeURIComponent(query)}&status=${status}&page=${page}&limit=20`, {}, true)
        .then(setData).catch(cause => setError((cause as Error).message));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, status, page, version]);

  async function toggle(user: AdminUser) {
    const next = user.status === "locked" ? "active" : "locked";
    if (!await confirm(`${next === "locked" ? "Khoá" : "Mở khoá"} tài khoản ${user.email}?`)) return;
    try {
      await api(`/admin/users/${user.id}`, json("PATCH", { status: next }), true);
      setVersion(value => value + 1);
    } catch (cause) { setError((cause as Error).message); }
  }

  return <div className="editor-stack">
    {sheet}
    <h1>Người dùng</h1>
    <div className="form-grid">
      <label>Tìm email hoặc tên<input type="search" enterKeyHint="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></label>
      <label>Trạng thái<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Tất cả</option><option value="active">Hoạt động</option><option value="locked">Đã khoá</option></select></label>
    </div>
    {error && <p role="alert" className="error">{error}</p>}
    {!data && !error && <p>Đang tải người dùng…</p>}
    {data && <>
      {!data.items.length && <p>Không tìm thấy người dùng.</p>}
      <div className="admin-list">
        {data.items.map(user => <article key={user.id} className="admin-row">
          <div><strong>{user.name}</strong><p>{user.email}</p></div>
          <span className={`status-chip status-${user.status}`}>{user.status === "locked" ? "Đã khoá" : "Hoạt động"}</span>
          <span>{user.weddingCount} thiệp · {money(user.paidAmount)}</span>
          <div className="actions"><Link to={`/admin/users/${user.id}`}>Chi tiết</Link><button onClick={() => void toggle(user)}>{user.status === "locked" ? "Mở khoá" : "Khoá"}</button></div>
        </article>)}
      </div>
      <div className="actions"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button><span>Trang {page} / {Math.max(1, Math.ceil(data.total / data.limit))}</span><button disabled={page * data.limit >= data.total} onClick={() => setPage(page + 1)}>Sau</button></div>
    </>}
  </div>;
}
