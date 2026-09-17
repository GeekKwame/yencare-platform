import api from "./api";
import { DEFAULT_CLINIC_SITE, todayIsoDate } from "../data/mockAppointments";


export async function createAppointment(data) {
  const response = await api.post("/appointments", data);
  return response.data;
}

export async function callNextPatient({ roomId }) {
  const response = await api.post("/queue/call-next", { roomId });
  return response.data;
}

export async function getRooms() {
  const response = await api.get("/rooms");
  return response.data;
}

export async function advanceQueue(roomId) {
  const response = await api.post("/queue/advance", { roomId });
  return response.data;
}

export async function markNoShow(appointmentId) {
  const response = await api.post("/queue/no-show", { appointmentId });
  return response.data;
}
/**
 * @param {string} [clinicSite]
 * @param {string} [date] YYYY-MM-DD
 */
export async function getTodaysAppointments(
  clinicSite = DEFAULT_CLINIC_SITE,
  date = todayIsoDate(),
) {
  const response = await api.get("/appointments", {
    params: { date, clinicSite },
  });
  return response.data;
}

/**
 * @param {string} id
 * @param {string} status
 */
export async function updateAppointmentStatus(id, status) {
  const response = await api.patch(`/appointments/${id}/status`, { status });
  return response.data;
}
