export const AUTH_ACCESS_TOKEN_KEY = "auth:access";
export const AUTH_REFRESH_TOKEN_KEY = "auth:refresh";
export const AUTH_LOGGED_IN_KEY = "auth:loggedIn";
export const AUTH_USER_KEY = "auth:user";

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthTokens(access: string, refresh: string): void {
  localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, access);
  localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refresh);
  localStorage.setItem(AUTH_LOGGED_IN_KEY, "true");
}

export function setAccessToken(access: string): void {
  localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, access);
}

export function clearAuthStorage(): void {
  try {
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    localStorage.setItem(AUTH_LOGGED_IN_KEY, "false");
  } catch {
    // ignore storage errors
  }
}

export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}
