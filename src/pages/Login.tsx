import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(() => {
    const message = sessionStorage.getItem("wi:login-message") || "";
    sessionStorage.removeItem("wi:login-message");
    return message;
  });
  const [errorField, setErrorField] = useState<"email" | "password" | null>(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErrorField("email"); return setError("Nhập địa chỉ email hợp lệ."); }
    if (!password) { setErrorField("password"); return setError("Nhập mật khẩu để tiếp tục."); }
    setBusy(true);
    setError("");
    setErrorField(null);
    try {
      await login(email.trim(), password);
      navigate((location.state as { from?: string; } | null)?.from || "/dashboard", { replace: true });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <Link className="brand" to="/">Thiệp Cưới
      </Link>
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Đăng nhập
        </h1>
        <p>Tiếp tục chăm chút tấm thiệp của hai bạn.
        </p>
        <label>Email
          <input aria-label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          {errorField === "email" && <span role="alert" className="error">{error}</span>}
        </label>
        <label>Mật khẩu
          <span className="password-field">
            <input aria-label="Mật khẩu" type={visible ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
              {visible ? "Ẩn" : "Hiện"}
            </button>
          </span>
          {errorField === "password" && <span role="alert" className="error">{error}</span>}
        </label>
        {error && !errorField && <p role="alert" className="error">
          {error}
        </p>}
        <button className="button" disabled={busy}>
          {busy ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <p>Chưa có tài khoản?{" "}
          <Link to="/register">Đăng ký
          </Link>
        </p>
      </form>
    </main>
  );
}
