import api from "./api";

/**
 * Patient registration & verification.
 * Backend: POST /api/patients and GET /api/patients/:identifier
 * Set VITE_API_BASE_URL=http://localhost:4000/api (see frontend/.env.example).
 * Contract: backend/README.md
 */
export async function registerPatient(data) {
  // Request: { fullName, studentIndex, phoneNumber | phone, nhis | nhisNumber }
  // Response includes both `phone` (Mongo / populate / SMS) and `phoneNumber`.
  const response = await api.post("/patients", {
    fullName: data.fullName ?? data.name,
    studentIndex: data.studentIndex ?? data.indexNumber,
    phoneNumber: data.phoneNumber ?? data.phone,
    nhis: data.nhis ?? data.nhisNumber,
  });
  return response.data;
}

export async function lookupPatient(identifier) {
  // identifier: 8-digit student index or Ghana phone number
  const response = await api.get(`/patients/${encodeURIComponent(identifier)}`);
  return response.data;
}
