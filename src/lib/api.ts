export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}
export const TOKEN_KEY = 'wi_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(value: string | null) {
  try {
    if (value) localStorage.setItem(TOKEN_KEY, value); else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage disabled */
  }
}

export async function api<T>(path: string, options: RequestInit = {}, authenticated = false): Promise<T> {
  const token = authenticated ? getToken() : null;
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`/api${path}`, { ...options, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && authenticated) {
      setToken(null);
      window.dispatchEvent(new Event('wi:unauthorized'));
    }
    throw new ApiError(response.status, typeof data.message === 'string' ? data.message : 'Có lỗi xảy ra. Vui lòng thử lại.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export const json = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
