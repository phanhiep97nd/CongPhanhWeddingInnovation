import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./lib/auth";
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Editor = lazy(() => import("./pages/Editor"));
const Invitation = lazy(() => import("./pages/Invitation"));

export function Home() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const id = params.get("id") || params.get("ID");
  if (id) return <Navigate replace to={`/w/${encodeURIComponent(import.meta.env.VITE_LEGACY_SLUG || "congphanh")}/${encodeURIComponent(id)}`} />;
  return <Landing />;
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
          <Route path="/dashboard" element={<ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>} />
          <Route path="/dashboard/:id" element={<ProtectedRoute>
            <Editor />
          </ProtectedRoute>} />
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
