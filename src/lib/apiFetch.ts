import { clearAuthStorage, getAccessToken, getRefreshToken, redirectToLogin, setAccessToken } from './authTokens';

const API = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const API_BASE = API;

export function apiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  // If VITE_API_URL already ends with /api and path is /api/... avoid /api/api/... (common live 404)
  if (p.startsWith('/api/') && /\/api$/i.test(API_BASE)) {
    return `${API_BASE}${p.slice(4)}`;
  }
  return `${API_BASE}${p}`;
}

function readAccessToken(): string | null {
  return getAccessToken();
}

function isAuthPath(path: string): boolean {
  return path.includes('/api/auth/token/') || path.includes('/api/token/');
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  const refresh = getRefreshToken();
  if (!refresh) {
    clearAuthStorage();
    redirectToLogin();
    throw new Error('Session expired. Please log in again.');
  }

  refreshPromise = fetch(apiUrl('/api/token/refresh/'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh }),
  })
    .then(async (res) => {
      const text = await res.text();
      const parsed = text ? JSON.parse(text) : {};
      if (!res.ok || typeof parsed.access !== 'string' || !parsed.access) {
        throw new Error('Token refresh failed.');
      }
      setAccessToken(parsed.access);
      return parsed.access as string;
    })
    .catch((err) => {
      clearAuthStorage();
      redirectToLogin();
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = readAccessToken();
  const headers = new Headers(init?.headers as HeadersInit | undefined);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = apiUrl(path);
  const first = await fetch(url, { ...init, headers });
  if (first.status !== 401 || isAuthPath(path)) {
    if (!first.ok) {
      console.error('API request failed:', { url, status: first.status, statusText: first.statusText });
    }
    return first;
  }

  // Access token may have expired; refresh once and retry.
  const nextAccess = await refreshAccessToken();
  const retryHeaders = new Headers(init?.headers as HeadersInit | undefined);
  retryHeaders.set('Authorization', `Bearer ${nextAccess}`);
  const retry = await fetch(url, { ...init, headers: retryHeaders });
  if (!retry.ok) {
    console.error('API retry failed:', { url, status: retry.status, statusText: retry.statusText });
  }
  return retry;
}

function parseErrorBody(body: unknown, rawText: string, status: number): string {
  const head = (rawText || '').trim().slice(0, 400);
  const fallback = head ? `HTTP ${status}: ${head}` : `HTTP ${status} ${status === 502 ? 'Bad Gateway' : ''}`.trim();

  if (body === null || body === undefined) return fallback || 'Request failed';
  if (typeof body !== 'object') return fallback || 'Request failed';

  const o = body as Record<string, unknown>;

  if (typeof o.detail === 'string' && o.detail.trim()) return o.detail.trim();
  if (Array.isArray(o.detail) && o.detail.length) return JSON.stringify(o.detail);

  const err = o.error;
  if (err && typeof err === 'object' && err !== null) {
    const em = (err as Record<string, unknown>).message;
    if (typeof em === 'string' && em.trim()) return em.trim();
  }
  if (typeof err === 'string' && err.trim()) return err.trim();

  const parts: string[] = [];
  for (const [k, v] of Object.entries(o)) {
    if (k === 'detail' || k === 'error') continue;
    parts.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  }
  if (parts.length) return parts.join(' ');
  return fallback || 'Request failed';
}

export async function apiFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  const text = await res.text();
  if (!res.ok) {
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = null;
    }
    throw new Error(parseErrorBody(parsed, text, res.status) || res.statusText);
  }
  return text ? (JSON.parse(text) as T) : (null as unknown as T);
}

export async function apiFetchVoid(path: string, init?: RequestInit): Promise<void> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = null;
    }
    throw new Error(parseErrorBody(parsed, text, res.status) || res.statusText);
  }
}
