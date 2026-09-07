import api from "./api";

export async function registerPatient(data) {
  // data: { fullName, studentIndex, phoneNumber, nhis }
  const response = await api.post("/patients", data);
  return response.data;
}

export async function lookupPatient(identifier) {
  // identifier: student index or phone number
  const response = await api.get(`/patients/${identifier}`);
  return response.data;
}