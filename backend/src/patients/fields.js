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
  const candidates = [requestedPhone, resolvePatientPhone(patient)];
  for (const candidate of candidates) {
    if (candidate == null || String(candidate).trim() === '') continue;
    try {
      return normalizeGhanaPhone(candidate);
    } catch {
      // try the next known number
    }
  }
  return null;
}

/**
 * Unique E.164 destinations to try for a booking confirmation.
 *
 * @param {object | null | undefined} patient
 * @param {unknown} [requestedPhone]
 * @returns {string[]}
 */
export function bookingSmsDestinations(patient, requestedPhone) {
  const destinations = [];
  const seen = new Set();
  for (const candidate of [requestedPhone, resolvePatientPhone(patient)]) {
    if (candidate == null || String(candidate).trim() === '') continue;
    try {
      const phone = normalizeGhanaPhone(candidate);
      if (!seen.has(phone)) {
        seen.add(phone);
        destinations.push(phone);
      }
    } catch {
      // skip unusable values
    }
  }
  return destinations;
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
