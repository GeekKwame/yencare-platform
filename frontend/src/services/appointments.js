import api from "./api";

export async function createAppointment(data) {
  const response = await api.post("/appointments", data);
  return response.data;
}

export async function getTodaysAppointments(clinic) {
  // Guessed contract — confirm with Able once this endpoint exists
  const response = await api.get("/appointments", {
    params: { date: new Date().toISOString().slice(0, 10), clinic },
  });
  return response.data;
}

export async function updateAppointmentStatus(id, status) {
  // Guessed contract — confirm with Able once this endpoint exists
  const response = await api.patch(`/appointments/${id}/status`, { status });
  return response.data;
}