import axios from "axios";

// Use same-origin API routes so Vercel rewrites can proxy backend
// and avoid browser-side CORS failures.
const baseURL = "";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

export default api;
