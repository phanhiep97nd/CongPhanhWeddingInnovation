import { BRAND_NAME } from "../lib/brand";
import BrandLogo from "../components/BrandLogo";
import { useConfirmSheet } from "../components/ConfirmSheet";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, json } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Wedding, WeddingSummary } from "../lib/types";
import { cldUrl } from "../lib/images";

export function slugify(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50).replace(/-+$/, "");
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<WeddingSummary[]>([]);
  const [groom, setGroom] = useState("");
  const [bride, setBride] = useState("");
  const [slug, setSlug] = useState("");
  const [editedSlug, setEditedSlug] = useState(false);
  const [availability, setAvailability] = useState<{ available: boolean; valid: boolean; } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { confirm, sheet } = useConfirmSheet();
  useEffect(() => {
    api<WeddingSummary[]>("/weddings", {}, true).then(setItems).catch(e => setError(e.message));
  }, []);
  useEffect(() => {
    if (!editedSlug) setSlug(slugify([groom, bride].filter(Boolean).join("-")));
  }, [groom, bride, editedSlug]);
  useEffect(() => {
    let active = true;
    setAvailability(null);
    if (!slug) return;
    const timer = setTimeout(() => {
      api<{ available: boolean; valid: boolean; }>(`/weddings/slug-available?slug=${encodeURIComponent(slug)}`, {}, true).then(result => {
        if (active) setAvailability(result);
      }).catch(() => {
      });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [slug]);
  async function create(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!groom.trim() || !bride.trim() || !availability?.valid || !availability.available) {
      setError("Vui lòng nhập tên hai bạn và chọn đường dẫn hợp lệ, còn trống.");
      return;
    }
    setBusy(true);
    try {
      const result = await api<Wedding>("/weddings", json("POST", { slug, couple: { groom: groom.trim(), bride: bride.trim(), groomFull: "", brideFull: "" } }), true);
      navigate(`/dashboard/${result.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: WeddingSummary) {
    if (!await confirm(`Xóa thiệp của ${item.couple.groom} & ${item.couple.bride}? Khách mời và ảnh cũng sẽ bị xóa.`)) return;
    try {
      await api<void>(`/weddings/${item.id}`, { method: "DELETE" }, true);
      setItems(old => old.filter(w => w.id !== item.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function copyLink(item: WeddingSummary) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/w/${encodeURIComponent(item.slug)}`);
      setError("Đã sao chép liên kết thiệp.");
    } catch {
      setError("Không thể sao chép. Hãy mở thiệp và sao chép liên kết trên thanh địa chỉ.");
    }
  }
  return <main className="dashboard">
    {sheet}
    <header className="dash-header">
      <Link className="brand" to="/" aria-label={BRAND_NAME}><BrandLogo />
      </Link>
      <span>Xin chào,{" "}
        {user?.name}
      </span>
      {user?.role === "admin" && <Link to="/admin">Quản trị</Link>}
      <button className="button-outline" onClick={() => {
        logout();
        navigate("/login");
      }}>Đăng xuất
      </button>
    </header>
    <div className="shell">
      <h1>Thiệp cưới của tôi
      </h1>
      <form className="create-card" onSubmit={create}>
        <h2>Tạo thiệp mới
        </h2>
        <div className="form-grid">
          <label>Tên chú rể
            <input autoComplete="given-name" enterKeyHint="next" value={groom} onChange={e => setGroom(e.target.value)} />
          </label>
          <label>Tên cô dâu
            <input autoComplete="given-name" enterKeyHint="next" value={bride} onChange={e => setBride(e.target.value)} />
          </label>
          <label className="full">Đường dẫn thiệp
            <input aria-label="Đường dẫn thiệp" inputMode="url" autoComplete="off" enterKeyHint="done" value={slug} onChange={e => {
              setEditedSlug(true);
              setSlug(e.target.value.toLowerCase());
            }} aria-describedby="slug-status" />
            <small id="slug-status">
              {slug && (availability ? !availability.valid ? "Đường dẫn không hợp lệ" : availability.available ? "Đường dẫn còn trống" : "Đường dẫn đã được dùng" : "Đang kiểm tra...")}
            </small>
          </label>
        </div>
        <p>{user?.defaultWeddingPlan === "premium"
          ? "Tài khoản của bạn được tạo thiệp Cao cấp với đầy đủ tính năng, không cần thanh toán."
          : "Gói miễn phí tự thêm 4 ký tự vào cuối đường dẫn khi tạo thiệp."}</p>
        <button className="button" disabled={busy || !availability?.available || !availability.valid}>Tạo thiệp
        </button>
      </form>
      {error && <p role="alert" className="error">
        {error}
      </p>}
      {items.length === 0 && (
        <div className="dashboard-empty">
          <h2>Thiệp đầu tiên của hai bạn bắt đầu ở đây</h2>
          <p>Nhập tên cô dâu, chú rể và chọn đường dẫn ở biểu mẫu phía trên để tạo thiệp.</p>
        </div>
      )}
      <div className="wedding-cards">
        {items.map(item => <article key={item.id} className="wedding-card">
          {item.coverImage && <img src={cldUrl(item.coverImage, 640)} alt="Ảnh bìa" loading="lazy" decoding="async" />}
          <div>
            <h2>
              {item.couple.groom} &{" "}
              {item.couple.bride}
            </h2>
            <p>
              {item.dateText || "Chưa đặt ngày"} ·{" "}
              {item.guestCount} khách
            </p>
            <p>
              {item.published ? "Đã xuất bản" : "Đang ẩn"}
            </p>
            {item.expiresAt && <p>Hết hạn {new Date(item.expiresAt).toLocaleDateString("vi-VN")}</p>}
            <div className="actions">
              <Link className="button" to={`/dashboard/${item.id}`}>Sửa
              </Link>
              <a className="button-outline" href={`/w/${item.slug}`} target="_blank" rel="noreferrer">Xem thiệp
              </a>
              <div className="wedding-more">
                <button className="text-button wedding-more-toggle" aria-expanded={openMenu === item.id} aria-label="Thêm thao tác" onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}>⋯</button>
                <div className={openMenu === item.id ? "wedding-more-actions open" : "wedding-more-actions"}>
                  <button className="text-button" onClick={() => { setOpenMenu(null); void copyLink(item); }}>Copy link</button>
                  <button className="text-button" onClick={() => { setOpenMenu(null); void remove(item); }}>Xóa</button>
                </div>
              </div>
            </div>
          </div>
        </article>)}
      </div>
    </div>
  </main>;
}
