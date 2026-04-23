import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import api from "@/services/api";

import { apiUrl } from "@/lib/apiFetch";
import {
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_LOGGED_IN_KEY,
  AUTH_USER_KEY,
  clearAuthStorage,
  setAuthTokens,
} from "@/lib/authTokens";

const STORAGE_KEY = AUTH_LOGGED_IN_KEY;
const USER_STORAGE_KEY = AUTH_USER_KEY;

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
        // Backend uses SimpleJWT (see `backend/config/config/urls.py`)
        apiUrl('/api/token/'),
        { username: trimmedUsername, password },
        { headers: { "Content-Type": "application/json", Accept: "application/json" } }
      );
      body = tokenRes.data ?? {};
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error("Login request failed:", {
          message: err.message,
          url: err.config?.baseURL ? `${err.config.baseURL}${err.config.url || ""}` : err.config?.url,
          method: err.config?.method,
          status: err.response?.status,
          data: err.response?.data,
        });
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
        throw new Error("Login failed. Please check your credentials and try again.");
      }
      console.error("Unexpected login error:", err);
      throw err instanceof Error ? err : new Error("Login failed.");
    }

    if (!body.access || !body.refresh) {
      const detail =
        typeof body.detail === "string"
          ? body.detail
          : "Login failed: access/refresh token not returned by API.";
      throw new Error(detail);
    }
    try {
      setAuthTokens(body.access, body.refresh);
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
    clearAuthStorage();
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
