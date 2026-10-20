import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, json } from "../../lib/api";
import { guestsCsv } from "../../lib/csv";
import { parseBulkGuests } from "../../lib/guests";
import { inviteLink } from "../../lib/links";
import type { Guest, Stats } from "../../lib/types";
import { Field } from "./Fields";

export default function GuestsTab({ weddingId, slug }: { weddingId: string; slug: string; }) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [invitationName, setInvitationName] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bulk, setBulk] = useState("");
  const [editing, setEditing] = useState<Guest | null>(null);
  const [message, setMessage] = useState("");
  const base = `/weddings/${weddingId}`;
  async function refresh() {
    const [list, counts] = await Promise.all([api<Guest[]>(`${base}/guests`, {}, true), api<Stats>(`${base}/stats`, {}, true)]);
    setGuests(list);
    setStats(counts);
  }
  useEffect(() => {
    void refresh().catch(e => setMessage(e.message));
  }, [weddingId]);
  const visible = useMemo(() => guests.filter(g => (filter === "all" || g.status === filter) && `${g.invitationName} ${g.name} ${g.phone}`.toLowerCase().includes(search.toLowerCase())), [guests, filter, search]);
  async function add(e: FormEvent) {
    e.preventDefault();
    if (!invitationName.trim()) return;
    try {
      await api<Guest>(`${base}/guests`, json("POST", { invitationName: invitationName.trim(), name: name.trim(), phone: phone.trim() }), true);
      setInvitationName("");
      setName("");
      setPhone("");
      await refresh();
      setMessage("Đã thêm khách mời.");
    } catch (err) {
      setMessage((err as Error).message);
    }
  }
  async function addBulk() {
    const parsed = parseBulkGuests(bulk);
    if (!parsed.length || parsed.length > 500) {
      setMessage("Nhập từ 1 đến 500 khách.");
      return;
    }
    try {
      await api<Guest[]>(`${base}/guests/bulk`, json("POST", { guests: parsed }), true);
      setBulk("");
      await refresh();
      setMessage(`Đã thêm ${parsed.length} khách.`);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }
  async function saveGuest(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      await api<Guest>(`${base}/guests/${editing.id}`, json("PUT", { invitationName: editing.invitationName, name: editing.name, phone: editing.phone, status: editing.status, guestCount: editing.guestCount, joinGroup: editing.joinGroup, pickupPoint: editing.pickupPoint, room: editing.room, note: editing.note }), true);
      setEditing(null);
      await refresh();
      setMessage("Đã lưu khách mời.");
    } catch (err) {
      setMessage((err as Error).message);
    }
  }
  async function remove(g: Guest) {
    if (!window.confirm(`Xóa khách ${g.invitationName}?`)) return;
    try {
      await api<void>(`${base}/guests/${g.id}`, { method: "DELETE" }, true);
      await refresh();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Đã sao chép liên kết.");
    } catch {
      setMessage("Không thể sao chép.");
    }
  }
  function exportCsv() {
    const blob = new Blob([guestsCsv(guests, window.location.origin, slug)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `khach-moi-${slug}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return <div className="editor-stack">
    <div className="stats">
      {stats && <>
        <span>Tổng:
          {stats.total}
        </span>
        <span>Tham dự:
          {stats.yes}
        </span>
        <span>Không đến:
          {stats.no}
        </span>
        <span>Chờ:
          {stats.pending}
        </span>
        <span>Số người:
          {stats.attendees}
        </span>
      </>}
    </div>
    <form onSubmit={add} className="editor-item">
      <h3>Thêm khách mời
      </h3>
      <div className="form-grid">
        <Field label="Tên trên thiệp" value={invitationName} onChange={setInvitationName} />
        <Field label="Tên thật" value={name} onChange={setName} />
        <Field label="SĐT" value={phone} onChange={setPhone} />
      </div>
      <button className="button">Thêm khách
      </button>
    </form>
    <div className="editor-item">
      <h3>Thêm nhiều khách
      </h3>
      <label>Mỗi dòng: Tên trên thiệp | Tên thật | SĐT
        <textarea value={bulk} onChange={e => setBulk(e.target.value)} rows={5} />
      </label>
      <p role="status">{parseBulkGuests(bulk).length} khách hợp lệ trong danh sách</p>
      <button className="button-outline" onClick={() => void addBulk()}>Thêm danh sách
      </button>
    </div>
    <div className="actions">
      <button className="button-outline" onClick={() => void copy(guests.map(g => `${g.invitationName}: ${inviteLink(window.location.origin, slug, g.code)}`).join("\n"))}>Sao chép tất cả liên kết
      </button>
      <button className="button-outline" onClick={exportCsv}>Xuất CSV
      </button>
    </div>
    {message && <p role="status">
      {message}
    </p>}
    <div className="form-grid">
      <label>Tìm khách
        <input value={search} onChange={e => setSearch(e.target.value)} />
      </label>
      <label>Trạng thái
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Tất cả
          </option>
          <option value="pending">Chờ
          </option>
          <option value="yes">Tham dự
          </option>
          <option value="no">Không đến
          </option>
        </select>
      </label>
    </div>
    <div className="guest-list">
      <div className="guest-table-head" aria-hidden="true"><span>Tên trên thiệp</span><span>Liên hệ</span><span>Trạng thái</span><span>Thao tác</span></div>
      {visible.length === 0 && <p>{guests.length ? "Không có khách nào khớp bộ lọc." : "Chưa có khách mời. Thêm khách đầu tiên bằng biểu mẫu phía trên."}</p>}
      {visible.map(g => <article className="editor-item" key={g.id}>
        <h3>
          {g.invitationName}
        </h3>
        <p>
          {g.name} ·
          {g.phone}
        </p>
        <p><span className={`status-chip status-${g.status}`}>{g.status === "yes" ? "Tham dự" : g.status === "no" ? "Không đến" : "Chờ"}</span> · {g.guestCount} người · {g.room}</p>
        <div className="actions">
          <button onClick={() => void copy(inviteLink(window.location.origin, slug, g.code))}>Sao chép liên kết
          </button>
          <button onClick={() => setEditing(g)}>Sửa
          </button>
          <button onClick={() => void remove(g)}>Xóa
          </button>
        </div>
      </article>)}
    </div>
    {editing && <div className="modal-backdrop" role="dialog" aria-label="Sửa khách mời">
      <form className="modal-card editor-stack" onSubmit={saveGuest}>
        <h3>Sửa khách mời
        </h3>
        {(["invitationName", "name", "phone", "pickupPoint", "room", "note"] as const).map(key => <Field key={key} label={({ invitationName: "Tên trên thiệp", name: "Tên thật", phone: "SĐT", pickupPoint: "Điểm đón", room: "Phòng", note: "Ghi chú" })[key]} value={editing[key]} onChange={value => setEditing({ ...editing, [key]: value })} />)}
        <label>Trạng thái
          <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as Guest["status"] })}>
            <option value="pending">Chờ
            </option>
            <option value="yes">Tham dự
            </option>
            <option value="no">Không đến
            </option>
          </select>
        </label>
        <label>Số khách
          <input type="number" min="0" max="20" value={editing.guestCount} onChange={e => setEditing({ ...editing, guestCount: Number(e.target.value) })} />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={editing.joinGroup} onChange={e => setEditing({ ...editing, joinGroup: e.target.checked })} /> Đi cùng đoàn
        </label>
        <div className="actions">
          <button className="button">Lưu
          </button>
          <button type="button" onClick={() => setEditing(null)}>Hủy
          </button>
        </div>
      </form>
    </div>}
  </div>;
}
