import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./lib/auth";
import { CARDS_PATH } from "./lib/links";
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Editor = lazy(() => import("./pages/Editor"));
const Invitation = lazy(() => import("./pages/Invitation"));
const GuestQrPrint = lazy(() => import("./pages/GuestQrPrint"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/Overview"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminUserDetail = lazy(() => import("./pages/admin/UserDetail"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const Hy3dPlayground = lazy(() => import("./pages/Hy3dPlayground"));

export function Home() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const id = params.get("id") || params.get("ID");
  if (id) return <Navigate replace to={`/w/${encodeURIComponent(import.meta.env.VITE_LEGACY_SLUG || "congphanh")}/${encodeURIComponent(id)}`} />;
  return <Landing />;
}

// Old /dashboard links (bookmarks, payment return pages of earlier orders) land on the same page, query string included.
function LegacyDashboard() {
  const { "*": rest = "" } = useParams();
  const { search, hash } = useLocation();
  return <Navigate replace to={`${CARDS_PATH}${rest ? `/${rest}` : ""}${search}${hash}`} />;
}

export default function App() {
  return <BrowserRouter>
    <AuthProvider>
      <Suspense fallback={<p className="page-loading">Đang tải...
      </p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path={CARDS_PATH} element={<ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>} />
          <Route path={`${CARDS_PATH}/:id`} element={<ProtectedRoute>
            <Editor />
          </ProtectedRoute>} />
          <Route path={`${CARDS_PATH}/:id/qr`} element={<ProtectedRoute><GuestQrPrint /></ProtectedRoute>} />
          <Route path="/dashboard/*" element={<LegacyDashboard />} />
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          {import.meta.env.DEV && <Route path="/__hy3d" element={<Hy3dPlayground />} />}
          <Route path="/w/:slug" element={<Invitation />} />
          <Route path="/w/:slug/:code" element={<Invitation />} />
          <Route path="*" element={<main className="shell">
            <h1>Không tìm thấy trang
            </h1>
            <a href="/">Về trang chủ
            </a>
          </main>} />
        </Routes>
      </Suspense>
    </AuthProvider>
  </BrowserRouter>;
}
