import api from "./api";

export async function listClinicians() {
  const response = await api.get("/clinicians");
  return response.data;
}

export async function listRooms() {
  const response = await api.get("/rooms");
  return response.data;
}

export async function listTimeSlots(params = {}) {
  const response = await api.get("/time-slots", { params });
  return response.data;
}
