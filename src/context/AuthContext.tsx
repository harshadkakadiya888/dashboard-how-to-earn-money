import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import api from "@/services/api";

import { AUTH_ACCESS_TOKEN_KEY, AUTH_REFRESH_TOKEN_KEY } from "@/lib/apiFetch";

const STORAGE_KEY = "auth:loggedIn";
const USER_STORAGE_KEY = "auth:user";
const API = import.meta.env.VITE_API_URL;

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
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

  const login = useCallback(async (username: string, password: string) => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      throw new Error("Username is required");
    }

    let body: { access?: string; refresh?: string; detail?: string } = {};
    try {
      const tokenRes = await api.post(
        `${API}/api/auth/token/`,
        { username: trimmedUsername, password },
        { headers: { "Content-Type": "application/json", Accept: "application/json" } }
      );
      body = tokenRes.data ?? {};
    } catch (err) {
      if (axios.isAxiosError(err)) {
        body = (err.response?.data ?? {}) as { access?: string; refresh?: string; detail?: string };

        // Browser-only errors (CORS, DNS, offline, mixed content) come without a response body.
        if (!err.response) {
          throw new Error(
            "Network/CORS error: request did not reach API. Check CORS, API URL, and http/https mismatch.",
          );
        }

        if (err.response.status === 401) {
          throw new Error("Invalid credentials");
        }

        if (err.response.status >= 500) {
          throw new Error("Server error. Please try again in a moment.");
        }
      }
    }

    if (!body.access) {
      const detail =
        typeof body.detail === "string"
          ? body.detail
          : "Invalid credentials. Please verify your backend user and password.";
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

    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ username: trimmedUsername }));
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
