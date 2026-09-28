import api from "./api";

/**
 * Patient registration & verification.
 * Backend: POST /api/patients
 * Set VITE_API_BASE_URL=http://localhost:4000/api (see frontend/.env.example).
 * Contract: backend/README.md
 */
export async function registerPatient(data) {
  // Request: { fullName, studentIndex, phoneNumber | phone, nhis | nhisNumber }
  // Response: { id } for public callers; the full record with a reception/admin token.
  const response = await api.post("/patients", {
    fullName: data.fullName ?? data.name,
    studentIndex: data.studentIndex ?? data.indexNumber,
    phoneNumber: data.phoneNumber ?? data.phone,
    nhis: data.nhis ?? data.nhisNumber,
  });
  return response.data;
}
