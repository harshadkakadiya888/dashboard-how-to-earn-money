const API = import.meta.env.VITE_API_URL;

/** Keys shared with AuthContext for SimpleJWT access/refresh. */
export const AUTH_ACCESS_TOKEN_KEY = 'auth:access';
export const AUTH_REFRESH_TOKEN_KEY = 'auth:refresh';

export function apiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${API}${path}`;
}

function readAccessToken(): string | null {
  try {
    return localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = readAccessToken();
  const headers = new Headers(init?.headers as HeadersInit | undefined);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(apiUrl(path), { ...init, headers });
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
