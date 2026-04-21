import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

import { AUTH_ACCESS_TOKEN_KEY, AUTH_REFRESH_TOKEN_KEY } from "@/lib/apiFetch";

const API = import.meta.env.VITE_API_URL;

// Dashboard login: email/password checked here; JWT uses Django username (must match seed_dummy_notifications).
export const STATIC_CREDENTIALS = {
  email: "darshilthummar@gmail.com",
  password: "darshil01",
  /** Must match a Django User.username (see `python manage.py seed_dummy_notifications`). */
  djangoUsername: "darshilthummar",
};

const STORAGE_KEY = "auth:loggedIn";
const USER_STORAGE_KEY = "auth:user";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStoredAccessToken(): string | null {
  try {
    return localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const flag = localStorage.getItem(STORAGE_KEY) === "true";
      // Stale UI login without JWT (e.g. before API wiring) cannot call protected endpoints.
      if (flag && !readStoredAccessToken()) {
        localStorage.setItem(STORAGE_KEY, "false");
        return false;
      }
      return flag;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isAuthenticated));
    } catch {
      // ignore storage errors
    }
  }, [isAuthenticated]);

  const login = useCallback(async (email: string, password: string) => {
    const ok = email === STATIC_CREDENTIALS.email && password === STATIC_CREDENTIALS.password;
    await new Promise((r) => setTimeout(r, 250)); // tiny delay for UX
    if (!ok) throw new Error("Invalid email or password");

    const data = {
      username: STATIC_CREDENTIALS.djangoUsername,
      password,
    };
    let body: { access?: string; refresh?: string; detail?: string } = {};
    try {
      const tokenRes = await axios.post(`${API}/api/auth/token/`, data, {
        headers: { "Content-Type": "application/json", Accept: "application/json" },
      });
      body = tokenRes.data ?? {};
    } catch (err) {
      if (axios.isAxiosError(err)) {
        body = (err.response?.data ?? {}) as { access?: string; refresh?: string; detail?: string };
      }
    }
    if (!body.access) {
      const detail =
        typeof body.detail === "string"
          ? body.detail
          : "Could not obtain API token. Start Django on port 8000 and run: python manage.py seed_dummy_notifications";
      throw new Error(detail);
    }
    try {
      localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, body.access);
      if (body.refresh) {
        localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, body.refresh);
      }
    } catch {
      // ignore storage errors
    }

    const username = email.split("@")[0] || "admin";
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ username, email }));
    } catch {
      // ignore storage errors
    }
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
      localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    } catch {
      // ignore storage errors
    }
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(() => ({ isAuthenticated, login, logout }), [isAuthenticated, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
