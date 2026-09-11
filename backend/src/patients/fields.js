import { normalizeGhanaPhone } from '../sms/normalizePhone.js';

/**
 * Canonical Patient document fields (Mongo / Mongoose / populate):
 *   fullName, phone, studentIndex, nhisNumber
 *
 * HTTP JSON also repeats aliases so the web client and older Postman
 * collections keep working:
 *   phoneNumber → phone
 *   nhis        → nhisNumber
 */

/**
 * @param {object | null | undefined} patient
 * @returns {string | null}
 */
export function resolvePatientPhone(patient) {
  if (!patient || typeof patient !== 'object') return null;
  const value = patient.phone ?? patient.phoneNumber ?? null;
  return value == null || String(value).trim() === '' ? null : String(value);
}

/**
 * Confirmation SMS must go only to the patient who just booked.
 * Prefer the number entered for this booking; otherwise the number on file.
 *
 * @param {object | null | undefined} patient
 * @param {unknown} [requestedPhone]
 * @returns {string | null}
 */
export function resolveSmsDestination(patient, requestedPhone) {
  const stored = resolvePatientPhone(patient);
  if (requestedPhone == null || String(requestedPhone).trim() === '') {
    return stored;
  }

  try {
    return normalizeGhanaPhone(requestedPhone);
  } catch {
    return stored;
  }
}

/**
 * @param {object | null | undefined} patient
 * @returns {string | null}
 */
export function resolveNhis(patient) {
  if (!patient || typeof patient !== 'object') return null;
  const value = patient.nhisNumber ?? patient.nhis ?? null;
  return value == null || String(value).trim() === '' ? null : String(value);
}
