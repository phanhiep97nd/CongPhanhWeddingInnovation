import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, getToken, json, setToken } from './api';
import type { AuthResponse, User } from './types';

interface AuthState { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; register: (email: string, password: string, name: string) => Promise<void>; logout: () => void }
const AuthContext = createContext<AuthState | null>(null);
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider missing'); return value; }
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!getToken());
  useEffect(() => {
    const clear = () => { setUser(null); setLoading(false); };
    window.addEventListener('wi:unauthorized', clear);
    if (getToken()) api<{ user: User }>('/auth/me', {}, true).then(result => setUser(result.user)).catch(clear).finally(() => setLoading(false));
    return () => window.removeEventListener('wi:unauthorized', clear);
  }, []);
  const accept = (result: AuthResponse) => { setToken(result.token); setUser(result.user); };
  const login = async (email: string, password: string) => accept(await api<AuthResponse>('/auth/login', json('POST', { email, password })));
  const register = async (email: string, password: string, name: string) => accept(await api<AuthResponse>('/auth/register', json('POST', { email, password, name })));
  const logout = () => { setToken(null); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth(); const location = useLocation();
  if (loading) return <p className="page-loading">Đang tải tài khoản...</p>;
  return user ? <>{children}</> : <Navigate to="/login" state={{ from: location.pathname }} replace />;
}
