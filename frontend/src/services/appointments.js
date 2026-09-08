import api from "./api";

export async function createAppointment(data) {
  // data: { patientId, clinicSite, clinicianId, timeSlotId, visitType }
  const response = await api.post("/appointments", data);
  return response.data;
}