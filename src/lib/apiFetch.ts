import { clearAuthStorage, getAccessToken, getRefreshToken, redirectToLogin, setAccessToken } from './authTokens';

const API = (import.meta.env.VITE_API_URL || 'https://django-how-to-earn-money.onrender.com').replace(/\/$/, '');
const API_BASE = API;

export function apiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
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
      'ngrok-skip-browser-warning': 'true',
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
  headers.set('ngrok-skip-browser-warning', 'true');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const first = await fetch(apiUrl(path), { ...init, headers });
  if (first.status !== 401 || isAuthPath(path)) {
    return first;
  }

  // Access token may have expired; refresh once and retry.
  const nextAccess = await refreshAccessToken();
  const retryHeaders = new Headers(init?.headers as HeadersInit | undefined);
  retryHeaders.set('ngrok-skip-browser-warning', 'true');
  retryHeaders.set('Authorization', `Bearer ${nextAccess}`);
  return fetch(apiUrl(path), { ...init, headers: retryHeaders });
}

function parseErrorBody(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Request failed';
  const o = body as Record<string, unknown>;
  if (typeof o.detail === 'string') return o.detail;
  if (Array.isArray(o.detail)) return JSON.stringify(o.detail);
  const parts: string[] = [];
  for (const [k, v] of Object.entries(o)) {
    if (k === 'detail') continue;
    parts.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  }
  return parts.length ? parts.join(' ') : 'Request failed';
}

export async function apiFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  const text = await res.text();
  if (!res.ok) {
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = {};
    }
    throw new Error(parseErrorBody(parsed) || res.statusText);
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
      parsed = {};
    }
    throw new Error(parseErrorBody(parsed) || res.statusText);
  }
}
