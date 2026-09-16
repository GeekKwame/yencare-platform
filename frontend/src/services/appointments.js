import api from "./api";
import { DEFAULT_CLINIC_SITE, todayIsoDate } from "../data/mockAppointments";

export async function createAppointment(data) {
  const response = await api.post("/appointments", data);
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

/**
 * Public patient lookup: exactly one of reference, studentIndex, or phone.
 * Reference uses GET /appointments/:reference so staging works before /lookup deploys.
 * @param {{ reference?: string, studentIndex?: string, phone?: string }} query
 */
export async function lookupAppointment(query) {
  if (query.reference) {
    const response = await api.get(
      `/appointments/${encodeURIComponent(query.reference)}`,
    );
    return response.data;
  }

  const response = await api.get("/appointments/lookup", { params: query });
  return response.data;
}

/**
 * @param {string} idOrReference Mongo id or YC-XXXX
 * @param {{ cancelReason?: string }} [options]
 */
export async function cancelAppointment(idOrReference, options = {}) {
  const response = await api.patch(
    `/appointments/${encodeURIComponent(idOrReference)}/cancel`,
    { cancelReason: options.cancelReason },
  );
  return response.data;
}

/**
 * @param {string} idOrReference
 * @param {string} newSlotId
 */
export async function rescheduleAppointment(idOrReference, newSlotId, options = {}) {
  const response = await api.patch(
    `/appointments/${encodeURIComponent(idOrReference)}/reschedule`,
    {
      newSlotId,
      staffChangeReason: options.staffChangeReason,
    },
  );
  return response.data;
}

/**
 * Patient "I've arrived": BOOKED → CHECKED_IN, no queue token.
 * @param {string} reference
 * @param {{ phone?: string }} [options]
 */
export async function arriveAppointment(reference, options = {}) {
  const response = await api.post(
    `/appointments/${encodeURIComponent(reference)}/arrive`,
    { phone: options.phone },
  );
  return response.data;
}

/**
 * Live queue position for a YC reference.
 * @param {string} reference
 */
export async function getQueueStatus(reference) {
  const response = await api.get(
    `/appointments/${encodeURIComponent(reference)}/queue-status`,
  );
  return response.data;
}
