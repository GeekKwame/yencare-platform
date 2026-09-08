import axios from "axios";

// VITE_API_BASE_URL should be http://localhost:4000/api (see frontend/.env.example)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

export default api;