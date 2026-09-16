import axios from "axios";

const TOKEN_KEY = "yencare_staff_token";
const DEFAULT_PROD_API = "https://yencare-api-staging.onrender.com/api";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? DEFAULT_PROD_API : "http://localhost:4000/api"),
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !String(token).startsWith("demo-local.")) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // localStorage can throw in locked-down browsers
  }
  return config;
});

export default api;
