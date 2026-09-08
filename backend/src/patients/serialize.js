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
 * Public patient record — matches frontend `registerPatient` / `lookupPatient`.
 *
 * @param {object} row
 * @param {string} row.id
 * @param {string} row.fullName
 * @param {string | null} [row.studentIndex]
 * @param {string | null} [row.phoneNumber]
 * @param {string | null} [row.nhis]
 * @param {Date | string | null} [row.createdAt]
 * @param {Date | string | null} [row.updatedAt]
 */
export function serializePatient(row) {
  return {
    id: row.id,
    fullName: row.fullName,
    studentIndex: row.studentIndex ?? null,
    phoneNumber: row.phoneNumber ?? null,
    nhis: row.nhis ?? null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}
