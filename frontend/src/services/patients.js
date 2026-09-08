import api from "./api";

/**
 * Patient registration & verification.
 * Backend: POST /api/patients and GET /api/patients/:identifier
 * Set VITE_API_BASE_URL=http://localhost:4000/api (see frontend/.env.example).
 * Contract: backend/README.md
 */
export async function registerPatient(data) {
  // data: { fullName, studentIndex, phoneNumber, nhis }
  const response = await api.post("/patients", data);
  return response.data;
}

export async function lookupPatient(identifier) {
  // identifier: 8-digit student index or Ghana phone number
  const response = await api.get(`/patients/${encodeURIComponent(identifier)}`);
  return response.data;
}
