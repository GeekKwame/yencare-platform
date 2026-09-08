import { resolveNhis, resolvePatientPhone } from './fields.js';

/**
 * @param {Date | string | null | undefined} value
 * @returns {string | null}
 */
function iso(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Public patient record.
 * `phone` / `nhisNumber` match Mongo + Appointment.populate().
 * `phoneNumber` / `nhis` stay as aliases for the frontend client.
 *
 * @param {object} row
 */
export function serializePatient(row) {
  const phone = resolvePatientPhone(row);
  const nhis = resolveNhis(row);
  return {
    id: row.id,
    fullName: row.fullName,
    studentIndex: row.studentIndex ?? null,
    phone,
    phoneNumber: phone,
    nhisNumber: nhis,
    nhis,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}
