import { resolveNhis, resolvePatientPhone } from './fields.js';
import { maskPhone, maskNhis } from '../sms/normalizePhone.js';

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
 * When maskPrivate is true (for public lookup endpoints), sensitive identifiers (phone, nhis) are masked.
 * When maskPrivate is false (default), full unmasked details are returned.
 *
 * @param {object} row
 * @param {{ maskPrivate?: boolean }} [options]
 */
export function serializePatient(row, { maskPrivate = false } = {}) {
  const rawPhone = resolvePatientPhone(row);
  const rawNhis = resolveNhis(row);
  const phone = maskPrivate ? (rawPhone ? maskPhone(rawPhone) : null) : rawPhone;
  const nhis = maskPrivate ? (rawNhis ? maskNhis(rawNhis) : null) : rawNhis;

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
