import axios from "axios";

const API = import.meta.env.VITE_API_URL;
const baseURL = API;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

export default api;
