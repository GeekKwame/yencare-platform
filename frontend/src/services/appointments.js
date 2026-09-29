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
 * Public patient lookup requires both reference code and phone number.
 * @param {{ reference: string, phone: string }} query
 */
export async function lookupAppointment({ reference, phone }) {
  const response = await api.get(`/appointments/${encodeURIComponent(reference)}`, {
    headers: { "X-Booking-Phone": String(phone || "").trim() },
  });
  return response.data;
}

/**
 * Fetch upcoming appointments from a starting date (default today).
 * @param {string} [clinicSite]
 * @param {string} [fromDate] YYYY-MM-DD
 */
export async function getUpcomingAppointments(
  clinicSite = DEFAULT_CLINIC_SITE,
  fromDate = todayIsoDate(),
) {
  const response = await api.get("/appointments", {
    params: { fromDate, clinicSite, upcoming: true },
  });
  return response.data;
}

/**
 * Request a 4-digit SMS OTP to cancel an appointment.
 * @param {string} idOrReference
 */
export async function requestCancelOtp(idOrReference) {
  const response = await api.post(
    `/appointments/${encodeURIComponent(idOrReference)}/request-cancel-otp`,
  );
  return response.data;
}

/**
 * Request a 4-digit SMS OTP to reschedule an appointment.
 * @param {string} idOrReference
 */
export async function requestRescheduleOtp(idOrReference) {
  const response = await api.post(
    `/appointments/${encodeURIComponent(idOrReference)}/request-reschedule-otp`,
  );
  return response.data;
}

/**
 * @param {string} idOrReference Mongo id or YC-XXXX
 * @param {{ cancelReason?: string, otpCode?: string, phone?: string }} [options]
 */
export async function cancelAppointment(idOrReference, options = {}) {
  const response = await api.patch(
    `/appointments/${encodeURIComponent(idOrReference)}/cancel`,
    {
      cancelReason: options.cancelReason,
      otpCode: options.otpCode,
      phone: options.phone,
      phoneNumber: options.phone,
    },
  );
  return response.data;
}

/**
 * @param {string} idOrReference
 * @param {string} newSlotId
 * @param {{ staffChangeReason?: string, otpCode?: string, phone?: string }} [options]
 */
export async function rescheduleAppointment(idOrReference, newSlotId, options = {}) {
  const response = await api.patch(
    `/appointments/${encodeURIComponent(idOrReference)}/reschedule`,
    {
      newSlotId,
      staffChangeReason: options.staffChangeReason,
      otpCode: options.otpCode,
      phone: options.phone,
      phoneNumber: options.phone,
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
  const response = await api.post("/appointments/arrive", {
    reference,
    referenceCode: reference,
    phone: options.phone,
    phoneNumber: options.phone,
  });
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

/**
 * Verify student status at clinic arrival.
 * Receptionist inspects physical student ID card and verifies against patient record.
 * @param {string} idOrReference
 * @param {{
 *   studentIndex?: string,
 *   method?: 'STUDENT_ID_CARD' | 'STAFF_OVERRIDE',
 *   action?: 'VERIFY' | 'FAIL',
 *   reason?: string,
 *   enqueue?: boolean,
 * }} [options]
 */
export async function verifyStudentStatus(idOrReference, options = {}) {
  const response = await api.post(
    `/appointments/${encodeURIComponent(idOrReference)}/verify-student`,
    {
      studentIndex: options.studentIndex,
      method: options.method,
      action: options.action,
      reason: options.reason,
      enqueue: options.enqueue,
    },
  );
  return response.data;
}

