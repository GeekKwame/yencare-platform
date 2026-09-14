import axios from "axios";

const DEFAULT_PROD_API = "https://yencare-api-staging.onrender.com/api";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? DEFAULT_PROD_API : "http://localhost:4000/api"),
});

export default api;
