import axios from "axios";
import { clearAuthStorage, getAccessToken, getRefreshToken, redirectToLogin, setAccessToken } from "@/lib/authTokens";

const API = (import.meta.env.VITE_API_URL || "https://django-how-to-earn-money.onrender.com").replace(/\/$/, "");
const baseURL = API;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

let refreshPromise = null;

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

  refreshPromise = axios
    .post(`${API}/api/token/refresh/`, { refresh }, { headers: { "Content-Type": "application/json" } })
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
