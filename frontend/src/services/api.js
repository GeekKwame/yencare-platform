import axios from "axios";

// VITE_API_BASE_URL defaults to http://localhost:4000/api (see frontend/.env.example)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api",
});

export default api;