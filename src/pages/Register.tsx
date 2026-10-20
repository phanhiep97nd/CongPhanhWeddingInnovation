import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<"name" | "email" | "password" | null>(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) { setErrorField("name"); return setError("Nhập tên của bạn."); }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErrorField("email"); return setError("Nhập địa chỉ email hợp lệ."); }
    if (password.length < 8) { setErrorField("password"); return setError("Mật khẩu cần ít nhất 8 ký tự."); }
    setBusy(true);
    setError("");
    setErrorField(null);
    try {
      await register(email.trim(), password, name.trim());
      navigate("/dashboard", { replace: true });
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
        <h1>Tạo tài khoản
        </h1>
        <p>Mở một nơi dành riêng cho tấm thiệp của hai bạn.
        </p>
        <label>Tên của bạn
          <input aria-label="Tên của bạn" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
          {errorField === "name" && <span role="alert" className="error">{error}</span>}
        </label>
        <label>Email
          <input aria-label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          {errorField === "email" && <span role="alert" className="error">{error}</span>}
        </label>
        <label>Mật khẩu (ít nhất 8 ký tự)
          <span className="password-field">
            <input aria-label="Mật khẩu (ít nhất 8 ký tự)" type={visible ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
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
          {busy ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </button>
        <p>Đã có tài khoản?{" "}
          <Link to="/login">Đăng nhập tài khoản
          </Link>
        </p>
      </form>
    </main>
  );
}
