import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/auth";

export default function AdminLayout() {
  const { user, loading } = useAuth();
  // Wait for /auth/me: on a reload of /admin the user is still null for a moment.
  if (loading) return <p className="page-loading">Đang tải tài khoản...</p>;
  if (!user) return <Navigate to="/login" state={{ from: "/admin" }} replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <main className="admin-page">
    <header className="dash-header admin-header">
      <Link className="brand" to="/admin">Quản trị</Link>
      <nav aria-label="Quản trị">
        <NavLink to="/admin" end>Tổng quan</NavLink>
        <NavLink to="/admin/users">Người dùng</NavLink>
        <NavLink to="/admin/orders">Đơn hàng</NavLink>
        <NavLink to="/admin/settings">Cài đặt</NavLink>
      </nav>
      <Link to="/dashboard">Thiệp của tôi</Link>
    </header>
    <div className="shell admin-content"><Outlet /></div>
  </main>;
}
