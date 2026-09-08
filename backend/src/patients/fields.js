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
 * @param {object | null | undefined} patient
 * @returns {string | null}
 */
export function resolveNhis(patient) {
  if (!patient || typeof patient !== 'object') return null;
  const value = patient.nhisNumber ?? patient.nhis ?? null;
  return value == null || String(value).trim() === '' ? null : String(value);
}
