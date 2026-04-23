import axios from "axios";
import { clearAuthStorage, getAccessToken, getRefreshToken, redirectToLogin, setAccessToken } from "@/lib/authTokens";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const baseURL = API_ORIGIN;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise = null;
const authApi = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

const isAuthRoute = (url = "") => {
  return url.includes("/api/auth/token/") || url.includes("/api/token/");
};

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  const refresh = getRefreshToken();
  if (!refresh) {
    clearAuthStorage();
    redirectToLogin();
    throw new Error("Session expired. Please log in again.");
  }

  refreshPromise = authApi
    .post(`/api/token/refresh/`, { refresh })
    .then((res) => {
      const nextAccess = res?.data?.access;
      if (!nextAccess) throw new Error("Token refresh failed.");
      setAccessToken(nextAccess);
      return nextAccess;
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
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error?.response) {
      // Browser-only errors (CORS, DNS, offline, mixed content) come without a response body.
      console.error("Network/CORS error (no response):", {
        message: error?.message,
        url: error?.config?.baseURL ? `${error.config.baseURL}${error.config.url || ""}` : error?.config?.url,
        method: error?.config?.method,
      });
    }
    const originalRequest = error?.config;
    const status = error?.response?.status;

    // Do not retry auth routes or already retried requests.
    if (!originalRequest || originalRequest._retry || status !== 401 || isAuthRoute(originalRequest.url || "")) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      const nextAccess = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${nextAccess}`;
      return api(originalRequest);
    } catch (refreshErr) {
      return Promise.reject(refreshErr);
    }
  }
);

export default api;
